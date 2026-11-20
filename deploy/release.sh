#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/ateliercopies"
APP_USER="atelier"
ARCHIVE="/tmp/ateliercopies-src.tgz"
RELEASE_ID="$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="$APP_ROOT/releases/$RELEASE_ID"

if [ ! -f "$ARCHIVE" ]; then
  echo "Archive not found: $ARCHIVE" >&2
  exit 1
fi

mkdir -p "$RELEASE_DIR"
tar -xzf "$ARCHIVE" -C "$RELEASE_DIR"

cd "$RELEASE_DIR"
ln -sfn "$APP_ROOT/shared/.env" .env

mkdir -p public/uploads
if [ -d public/uploads/products ]; then
  cp -a public/uploads/products/. "$APP_ROOT/shared/uploads/products/" || true
fi
if [ -d public/uploads/reviews ]; then
  cp -a public/uploads/reviews/. "$APP_ROOT/shared/uploads/reviews/" || true
fi

chown -R "$APP_USER:$APP_USER" "$RELEASE_DIR" "$APP_ROOT/shared"

runuser -u "$APP_USER" -- bash -lc "cd '$RELEASE_DIR' && npm ci"
runuser -u "$APP_USER" -- bash -lc "cd '$RELEASE_DIR' && npm run db:generate"
runuser -u "$APP_USER" -- bash -lc "cd '$RELEASE_DIR' && npm run db:push"
runuser -u "$APP_USER" -- bash -lc "cd '$RELEASE_DIR' && npm run db:seed"
runuser -u "$APP_USER" -- bash -lc "cd '$RELEASE_DIR' && NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS='--max-old-space-size=768' npm run build"

rm -rf public/uploads/products public/uploads/reviews
ln -sfn "$APP_ROOT/shared/uploads/products" public/uploads/products
ln -sfn "$APP_ROOT/shared/uploads/reviews" public/uploads/reviews
rm -rf storage
ln -sfn "$APP_ROOT/shared/storage" storage
chown -h "$APP_USER:$APP_USER" public/uploads/products public/uploads/reviews storage

ln -sfn "$RELEASE_DIR" "$APP_ROOT/current"
chown -h "$APP_USER:$APP_USER" "$APP_ROOT/current"

cp /root/ateliercopies.service /etc/systemd/system/ateliercopies.service
systemctl daemon-reload
systemctl enable --now ateliercopies >/dev/null
systemctl restart ateliercopies

echo "RELEASE_READY:$RELEASE_ID"
