#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/var/www/ateliercopies/shared/.env"
TMP_FILE="$(mktemp)"

awk '
  BEGIN { updated = 0 }
  /^APP_URL=/ {
    print "APP_URL=\"https://www.ateliercopies.ru\""
    updated = 1
    next
  }
  { print }
  END {
    if (updated == 0) {
      print "APP_URL=\"https://www.ateliercopies.ru\""
    }
  }
' "$ENV_FILE" > "$TMP_FILE"

cat "$TMP_FILE" > "$ENV_FILE"
rm -f "$TMP_FILE"
chown atelier:atelier "$ENV_FILE"
chmod 600 "$ENV_FILE"
systemctl restart ateliercopies

grep '^APP_URL=' "$ENV_FILE"
systemctl is-active ateliercopies
