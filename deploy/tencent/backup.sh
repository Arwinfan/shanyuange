#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/shanyuan}"
BACKUP_DIR="${BACKUP_DIR:-/opt/shanyuan/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-shanyuan}"
UPLOAD_VOLUME="${PROJECT_NAME}_shanyuan_uploads"

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"

# Docker Compose accepts CRLF files, but Bash does not. Keep this script portable.
ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT
tr -d '\r' < .env.tencent > "$ENV_FILE"
set -a
source "$ENV_FILE"
set +a

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DB_FILE="$BACKUP_DIR/mysql-$STAMP.sql.gz"
UPLOAD_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"
COMPOSE=(docker compose -p "$PROJECT_NAME" --env-file .env.tencent -f deploy/tencent/docker-compose.yml -f deploy/tencent/docker-compose.existing-nginx.yml -f deploy/tencent/docker-compose.self-hosted.yml)

"${COMPOSE[@]}" exec -T mysql sh -lc 'exec mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction --routines --events --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"' | gzip -9 > "$DB_FILE"

VOLUME_PATH="$(docker volume inspect "$UPLOAD_VOLUME" --format '{{ .Mountpoint }}')"
tar -C "$VOLUME_PATH" -czf "$UPLOAD_FILE" .

sha256sum "$DB_FILE" "$UPLOAD_FILE" > "$BACKUP_DIR/checksums-$STAMP.txt"
find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" -delete

USAGE="$(df -P "$APP_DIR" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
if [ "$USAGE" -ge 85 ]; then
  echo "WARNING: disk usage is ${USAGE}% after backup" >&2
fi

echo "Backup complete: $STAMP"