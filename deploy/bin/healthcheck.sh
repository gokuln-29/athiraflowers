#!/usr/bin/env bash
# Monitoring probe, run every 5 minutes by athira-healthcheck.timer.
# Checks: public site over HTTPS, local health endpoint, disk pressure, TLS expiry. Pings a dead-man's-switch URL when all is well,
# so a missing ping (including a dead VPS) raises the alert. Config: /etc/athira/monitor.env
set -uo pipefail
# shellcheck disable=SC1091
. /etc/athira/monitor.env      # SITE_URL, PING_URL (healthchecks.io style), ALERT_WEBHOOK (optional, e.g. Slack/Discord-compatible), DISK_MAX_PCT, TLS_MIN_DAYS
DISK_MAX_PCT="${DISK_MAX_PCT:-85}"
TLS_MIN_DAYS="${TLS_MIN_DAYS:-14}"
problems=()

curl -fsS --max-time 10 -o /dev/null "$SITE_URL/en" || problems+=("site not reachable at $SITE_URL/en")
curl -fsS --max-time 5 http://127.0.0.1:3000/api/health | grep -q '"ok":true' || problems+=("app health endpoint failing")
used="$(df --output=pcent / | tail -1 | tr -dc 0-9)"
[ "$used" -lt "$DISK_MAX_PCT" ] || problems+=("disk ${used}% full (limit ${DISK_MAX_PCT}%)")
host="$(echo "$SITE_URL" | sed -E 's#https?://([^/:]+).*#\1#')"
end="$(echo | openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
if [ -n "$end" ]; then
  days=$(( ( $(date -d "$end" +%s) - $(date +%s) ) / 86400 ))
  [ "$days" -ge "$TLS_MIN_DAYS" ] || problems+=("TLS certificate expires in ${days} days")
else problems+=("could not read TLS certificate"); fi

if [ "${#problems[@]}" -eq 0 ]; then
  [ -n "${PING_URL:-}" ] && curl -fsS --max-time 10 -o /dev/null "$PING_URL"
  exit 0
fi
msg="Athira monitor: $(printf '%s; ' "${problems[@]}")"
echo "$msg" >&2
[ -n "${PING_URL:-}" ] && curl -fsS --max-time 10 -o /dev/null "$PING_URL/fail" --data-raw "$msg"
[ -n "${ALERT_WEBHOOK:-}" ] && curl -fsS --max-time 10 -o /dev/null -H 'content-type: application/json' -d "{\"text\":\"$msg\"}" "$ALERT_WEBHOOK"
exit 1
