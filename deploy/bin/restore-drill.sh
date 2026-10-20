#!/usr/bin/env bash
# Restore drill: pull the latest encrypted DB backup, restore it into a throwaway database, verify it, drop it.
# Run quarterly and after major schema changes, on an isolated host or against a scratch database, NEVER against production.
# Usage: restore-drill.sh            (reads /etc/athira/backup.env; DRILL_DB defaults to athira_restore_drill)
set -Eeuo pipefail
CONF="${BACKUP_ENV:-/etc/athira/backup.env}"
# shellcheck disable=SC1090
. "$CONF"
export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE
DRILL_DB="${DRILL_DB:-athira_restore_drill}"
[ "$DRILL_DB" != "$DB_NAME" ] || { echo "refusing: DRILL_DB equals the live database" >&2; exit 2; }
WORK="$(mktemp -d)"; chmod 700 "$WORK"
trap 'rm -rf "$WORK"; mysql --defaults-extra-file="${DRILL_DEFAULTS_FILE:-$MYSQL_DEFAULTS_FILE}" -e "DROP DATABASE IF EXISTS \`$DRILL_DB\`" 2>/dev/null || true' EXIT
MYSQL=(mysql --defaults-extra-file="${DRILL_DEFAULTS_FILE:-$MYSQL_DEFAULTS_FILE}")
START=$(date +%s)

echo "snapshot:"; restic snapshots --tag db --latest 1 --compact
restic restore latest --tag db --target "$WORK" >/dev/null
DUMP="$(find "$WORK" -name 'athira-db.sql.gz' | head -n1)"
[ -s "$DUMP" ] || { echo "no dump found in snapshot" >&2; exit 1; }
gzip -t "$DUMP"
echo "dump size: $(du -h "$DUMP" | cut -f1)"

"${MYSQL[@]}" -e "DROP DATABASE IF EXISTS \`$DRILL_DB\`; CREATE DATABASE \`$DRILL_DB\` CHARACTER SET utf8mb4"
gunzip -c "$DUMP" | "${MYSQL[@]}" "$DRILL_DB"

echo "table             restored    source"
status=0
for t in orders order_items products media categories customers admin_users leads; do
  r="$("${MYSQL[@]}" -N -e "SELECT COUNT(*) FROM \`$DRILL_DB\`.\`$t\`")"
  s="$("${MYSQL[@]}" -N -e "SELECT COUNT(*) FROM \`$DB_NAME\`.\`$t\`" 2>/dev/null || echo "n/a")"
  printf '%-16s %8s %9s\n' "$t" "$r" "$s"
done
"${MYSQL[@]}" -N -e "SELECT CONCAT('latest order: ', COALESCE(MAX(order_number),'none'), ' at ', COALESCE(MAX(created_at),'-')) FROM \`$DRILL_DB\`.orders"
"${MYSQL[@]}" -N -e "SELECT CONCAT('routines/triggers restored: ', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='$DRILL_DB'), '/', (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$DRILL_DB'))"
echo "restore drill finished in $(( $(date +%s) - START ))s"
exit $status
