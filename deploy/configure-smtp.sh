#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/var/www/ateliercopies/shared/.env"
APP_DIR="/var/www/ateliercopies/current"
BACKUP_FILE="$(mktemp)"

if [ ! -f "$ENV_FILE" ]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

cp "$ENV_FILE" "$BACKUP_FILE"

restore_env() {
  cat "$BACKUP_FILE" > "$ENV_FILE"
  rm -f "$BACKUP_FILE"
  chown atelier:atelier "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  systemctl restart ateliercopies
}

set_env() {
  local key="$1"
  local value="$2"
  local tmp
  tmp="$(mktemp)"

  if grep -q "^${key}=" "$ENV_FILE"; then
    awk -v key="$key" -v value="$value" '
      BEGIN { quote = sprintf("%c", 34) }
      $0 ~ "^" key "=" {
        print key "=" quote value quote
        next
      }
      { print }
    ' "$ENV_FILE" > "$tmp"
  else
    cp "$ENV_FILE" "$tmp"
    printf '%s="%s"\n' "$key" "$value" >> "$tmp"
  fi

  cat "$tmp" > "$ENV_FILE"
  rm -f "$tmp"
}

read_default() {
  local prompt="$1"
  local default="$2"
  local value
  read -r -p "$prompt [$default]: " value
  printf '%s' "${value:-$default}"
}

echo "SMTP setup for Atelier Copies"
echo "1) Mail.ru SMTP"
echo "2) Custom SMTP"
read -r -p "Choose provider [1]: " provider
provider="${provider:-1}"

if [ "$provider" = "1" ]; then
  smtp_host="smtp.mail.ru"
  smtp_port="465"
  smtp_secure="true"
  read -r -p "Mail.ru email: " smtp_user
  admin_email="$(read_default "Admin email for site notifications" "$smtp_user")"
  mail_from_name="$(read_default "Sender name" "Atelier Copies")"
else
  smtp_host="$(read_default "SMTP host" "smtp.example.com")"
  smtp_port="$(read_default "SMTP port" "587")"
  smtp_secure="$(read_default "SMTP secure true/false" "false")"
  smtp_user="$(read_default "SMTP user" "support@ateliercopies.ru")"
  admin_email="$(read_default "Admin email for site notifications" "$smtp_user")"
  mail_from_name="$(read_default "Sender name" "Atelier Copies")"
fi

read -r -s -p "SMTP password or app password: " smtp_password
echo

if [ -z "$smtp_user" ] || [ -z "$smtp_password" ]; then
  echo "SMTP user or password is empty, aborting." >&2
  exit 1
fi

mail_from="${mail_from_name} <${smtp_user}>"

set_env "MAIL_MODE" "smtp"
set_env "MAIL_FROM" "$mail_from"
set_env "MAIL_ADMIN_TO" "$admin_email"
set_env "SMTP_HOST" "$smtp_host"
set_env "SMTP_PORT" "$smtp_port"
set_env "SMTP_SECURE" "$smtp_secure"
set_env "SMTP_USER" "$smtp_user"
set_env "SMTP_PASSWORD" "$smtp_password"

chown atelier:atelier "$ENV_FILE"
chmod 600 "$ENV_FILE"

cd "$APP_DIR"
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if node <<'NODE'
const nodemailer = require("nodemailer");

const port = Number(process.env.SMTP_PORT || 587);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: process.env.SMTP_SECURE === "true" || port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function main() {
  await transporter.verify();
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_ADMIN_TO,
    subject: "SMTP test: Atelier Copies",
    text: [
      "SMTP is configured for Atelier Copies.",
      "",
      `Site: ${process.env.APP_URL}`,
      `From: ${process.env.MAIL_FROM}`,
    ].join("\n"),
  });
}

main()
  .then(() => {
    console.log("SMTP_TEST_OK");
  })
  .catch((error) => {
    console.error("SMTP_CONFIG_FAILED");
    console.error(error && error.message ? error.message : error);
    process.exit(1);
  });
NODE
then
  systemctl restart ateliercopies
  rm -f "$BACKUP_FILE"
  echo "SMTP_CONFIG_READY"
else
  restore_env
  exit 1
fi
