#!/usr/bin/env bash
# Encrypted offsite backup. Run daily by athira-backup.timer as root (or a dedicated backup user).
#   1. consistent MySQL dump -> gzip -> restic (client-side encrypted, deduplicated) -> offsite repository
#   2. product/upload images: rclone copy from the R2 bucket to a local stage, then restic
#   3. non-secret config (nginx, PM2, timers): restic.   .env files are NEVER included.
#   4. retention 14 daily / 8 weekly / 12 monthly, structural integrity check, success or failure ping
# Config: /etc/athira/backup.env (root 600). Keep these credentials separate from the website's.
set -Eeuo pipefail
CONF="${BACKUP_ENV:-/etc/athira/backup.env}"
# shellcheck disable=SC1090
. "$CONF"
# Required: RESTIC_REPOSITORY, RESTIC_PASSWORD_FILE, MYSQL_DEFAULTS_FILE (protected [client] file), DB_NAME
# Optional: R2_REMOTE (rclone remote:bucket), MEDIA_STAGE, EXTRA_PATHS, PING_URL, ALERT_WEBHOOK (+ rclone/restic backend vars)
MEDIA_STAGE="${MEDIA_STAGE:-/var/backups/athira-media}"
export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE
START=$(date +%s)
log() { printf '[backup %s] %s\n' "$(date -u +%FT%TZ)" "$*"; }

fail() {
  local msg="backup FAILED at line $1 (exit $2)"
  log "$msg" >&2
  [ -n "${PING_URL:-}" ] && curl -fsS --max-time 10 -o /dev/null "$PING_URL/fail" --data-raw "$msg" || true
  [ -n "${ALERT_WEBHOOK:-}" ] && curl -fsS --max-time 10 -o /dev/null -H 'content-type: application/json' -d "{\"text\":\"Athira $msg\"}" "$ALERT_WEBHOOK" || true
  exit "$2"
}
trap 'fail $LINENO $?' ERR

restic snapshots >/dev/null 2>&1 || { log "initialising repository"; restic init; }

log "database dump"
# Dump to a private temp file first: a failed mysqldump must never become a (silently empty) snapshot.
WORK="$(mktemp -d)"; chmod 700 "$WORK"; trap 'rm -rf "$WORK"' EXIT
DUMP="$WORK/athira-db.sql.gz"
mysqldump --defaults-extra-file="$MYSQL_DEFAULTS_FILE" --single-transaction --quick --routines --events --triggers --hex-blob --default-character-set=utf8mb4 "$DB_NAME" | gzip -9 > "$DUMP"
gzip -t "$DUMP"
[ "$(stat -c%s "$DUMP" 2>/dev/null || stat -f%z "$DUMP")" -gt 1024 ] || { echo "dump suspiciously small" >&2; exit 1; }
gunzip -c "$DUMP" | tail -n 3 | grep -q "Dump completed" || { echo "dump has no completion marker" >&2; exit 1; }
restic backup "$DUMP" --tag db --host athira

if [ -n "${R2_REMOTE:-}" ]; then
  log "media: syncing $R2_REMOTE to $MEDIA_STAGE"
  mkdir -p "$MEDIA_STAGE"
  rclone sync "$R2_REMOTE" "$MEDIA_STAGE" --checksum --fast-list --transfers 8
  restic backup "$MEDIA_STAGE" --tag media --host athira
fi

CONFIG_PATHS=()
for p in /etc/nginx/sites-available/athira.conf /etc/nginx/snippets/athira-proxy.conf /etc/systemd/system/athira-*.service /etc/systemd/system/athira-*.timer /srv/athira/current/deploy ${EXTRA_PATHS:-}; do
  [ -e "$p" ] && CONFIG_PATHS+=("$p")
done
[ "${#CONFIG_PATHS[@]}" -gt 0 ] && restic backup "${CONFIG_PATHS[@]}" --tag config --host athira

log "retention"
PRUNE=""; [ "$(date +%u)" = 7 ] && PRUNE="--prune"      # prune weekly (Sunday); forget daily
restic forget --host athira --group-by tags --keep-daily 14 --keep-weekly 8 --keep-monthly 12 $PRUNE

log "integrity check"
restic check --read-data-subset=2%

log "done in $(( $(date +%s) - START ))s"
[ -n "${PING_URL:-}" ] && curl -fsS --max-time 10 -o /dev/null "$PING_URL" || true
