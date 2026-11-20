#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/ateliercopies"
APP_USER="atelier"
DB_NAME="atelier_copies"
DB_USER="atelier_user"

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /bin/bash "$APP_USER"
fi

mkdir -p \
  "$APP_ROOT/releases" \
  "$APP_ROOT/shared/uploads/products" \
  "$APP_ROOT/shared/uploads/reviews" \
  "$APP_ROOT/shared/storage"

DB_PASS="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 32)"
AUTH_SECRET="$(openssl rand -hex 32)"

if runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  runuser -u postgres -- psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" >/dev/null
else
  runuser -u postgres -- psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" >/dev/null
fi

if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  runuser -u postgres -- createdb -O "$DB_USER" "$DB_NAME"
fi

runuser -u postgres -- psql -c "ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};" >/dev/null
runuser -u postgres -- psql -d "$DB_NAME" -c "ALTER SCHEMA public OWNER TO ${DB_USER}; GRANT ALL ON SCHEMA public TO ${DB_USER};" >/dev/null

cat > "$APP_ROOT/shared/.env" <<EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}?schema=public"
AUTH_SECRET="${AUTH_SECRET}"
APP_URL="https://www.ateliercopies.ru"
MAIL_MODE="log"
MAIL_FROM="Atelier Copies <no-reply@ateliercopies.ru>"
MAIL_ADMIN_TO="admin@ateliercopies.ru"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASSWORD=""
EOF

chown -R "$APP_USER:$APP_USER" "$APP_ROOT"
chmod 600 "$APP_ROOT/shared/.env"
systemctl enable --now postgresql nginx >/dev/null

echo "VPS_INIT_READY"
