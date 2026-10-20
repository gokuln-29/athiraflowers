#!/usr/bin/env bash
# Point `current` at an earlier release and reload. Usage: rollback.sh [release-stamp]   (default: the one before current)
# Database migrations are not reversed: releases must stay compatible with the previous schema (docs/DEPLOYMENT.md).
set -euo pipefail
ROOT=/srv/athira
CUR="$(readlink -f "$ROOT/current")"
if [ -n "${1:-}" ]; then TARGET="$ROOT/releases/$1"; else TARGET="$(ls -1dt "$ROOT"/releases/* | grep -vx "$CUR" | head -n1)"; fi
[ -d "$TARGET" ] || { echo "no such release: $TARGET" >&2; exit 1; }
echo "rolling back $CUR -> $TARGET"
ln -sfn "$TARGET" "$ROOT/current.new" && mv -Tf "$ROOT/current.new" "$ROOT/current"
sudo -u athira pm2 reload athira --update-env
sleep 3
curl -fsS --max-time 5 http://127.0.0.1:3000/api/health | grep -q '"ok":true' && echo "healthy" || { echo "UNHEALTHY after rollback" >&2; exit 1; }
