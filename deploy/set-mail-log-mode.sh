#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/var/www/ateliercopies/shared/.env"
TMP_FILE="$(mktemp)"

awk '
  BEGIN { updated = 0 }
  /^MAIL_MODE=/ {
    print "MAIL_MODE=\"log\""
    updated = 1
    next
  }
  { print }
  END {
    if (updated == 0) {
      print "MAIL_MODE=\"log\""
    }
  }
' "$ENV_FILE" > "$TMP_FILE"

cat "$TMP_FILE" > "$ENV_FILE"
rm -f "$TMP_FILE"
chown atelier:atelier "$ENV_FILE"
chmod 600 "$ENV_FILE"
systemctl restart ateliercopies

grep -E '^(MAIL_MODE|SMTP_HOST|SMTP_USER)=' "$ENV_FILE"
systemctl is-active ateliercopies
