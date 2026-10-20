#!/usr/bin/env bash
# Release deploy. Run as the `deploy` user on the VPS:   deploy/bin/deploy.sh <git-ref>
# Builds an immutable release directory, smoke-tests it on a spare port, then switches the `current` symlink and reloads PM2.
# If the post-switch health check fails it switches back automatically.
set -euo pipefail

REF="${1:?usage: deploy.sh <git-ref>}"
ROOT=/srv/athira
REPO="$ROOT/repo"
APP_ENV=/etc/athira/athira.env
MIGRATE_ENV=/etc/athira/migrate.env      # DDL credentials: readable by `deploy` only, never loaded by the running app
KEEP=5
STAMP="$(date -u +%Y%m%d%H%M%S)"
REL="$ROOT/releases/$STAMP"

log() { printf '[deploy %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
health() { curl -fsS --max-time 5 "http://127.0.0.1:$1/api/health" | grep -q '"ok":true'; }

[ -f "$APP_ENV" ] || { echo "missing $APP_ENV" >&2; exit 1; }
cd "$REPO" && git fetch --tags --prune origin
git rev-parse --verify "$REF^{commit}" >/dev/null
mkdir -p "$REL" && git archive "$REF" | tar -x -C "$REL"
cd "$REL"
echo "$(git -C "$REPO" rev-parse "$REF")" > .release-sha

log "installing dependencies from the lockfile"
npm ci --no-audit --no-fund

log "building (NEXT_PUBLIC_* values are inlined from $APP_ENV)"
set -a; . "$APP_ENV"; set +a
npm run build

log "running database migrations (forward only; see docs/DEPLOYMENT.md on compatible migrations)"
( set -a; . "$MIGRATE_ENV"; set +a; npm run db:migrate )

log "smoke test on port 3001"
node --env-file="$APP_ENV" node_modules/next/dist/bin/next start -p 3001 -H 127.0.0.1 &
SMOKE=$!
trap 'kill $SMOKE 2>/dev/null || true' EXIT
for i in $(seq 1 30); do health 3001 && break; sleep 1; [ "$i" = 30 ] && { echo "smoke test failed: not healthy after 30s" >&2; exit 1; }; done
curl -fsS --max-time 10 -o /dev/null "http://127.0.0.1:3001/en" || { echo "smoke test failed: /en" >&2; exit 1; }
curl -fsS --max-time 10 -o /dev/null "http://127.0.0.1:3001/ar" || { echo "smoke test failed: /ar" >&2; exit 1; }
kill $SMOKE; wait $SMOKE 2>/dev/null || true; trap - EXIT

PREV="$(readlink -f "$ROOT/current" 2>/dev/null || true)"
log "switching current -> $REL"
ln -sfn "$REL" "$ROOT/current.new" && mv -Tf "$ROOT/current.new" "$ROOT/current"
sudo -u athira pm2 startOrReload /srv/athira/current/deploy/ecosystem.config.cjs --update-env

for i in $(seq 1 30); do health 3000 && { log "healthy on 3000: release $STAMP is live"; break; }; sleep 1
  if [ "$i" = 30 ]; then
    log "NOT healthy after switch: rolling back"
    if [ -n "$PREV" ] && [ -d "$PREV" ]; then ln -sfn "$PREV" "$ROOT/current.new" && mv -Tf "$ROOT/current.new" "$ROOT/current"; sudo -u athira pm2 reload athira --update-env; fi
    exit 1
  fi
done

# Keep the newest $KEEP releases.
ls -1dt "$ROOT"/releases/* | tail -n +$((KEEP + 1)) | xargs -r rm -rf
