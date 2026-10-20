# Deployment guide

Target: one Hostinger Ubuntu LTS VPS running Nginx (TLS) in front of a Next.js app under PM2, MySQL on loopback, images on Cloudflare R2, encrypted offsite backups. Every command assumes you have read the "before you run" notes; nothing here has been run against the real server yet (see `LAUNCH_CHECKLIST.md` for what is verified).

Files referenced live in `deploy/`:

| File | Goes to |
| --- | --- |
| `deploy/bin/server-setup.sh`, `lock-ssh.sh` | run once as root |
| `deploy/nginx/athira.conf`, `athira-proxy.conf` | `/etc/nginx/sites-available/athira.conf`, `/etc/nginx/snippets/athira-proxy.conf` |
| `deploy/ecosystem.config.cjs` | used in place from `/srv/athira/current/deploy/` |
| `deploy/systemd/*.service|timer` | `/etc/systemd/system/` |
| `deploy/logrotate-athira` | `/etc/logrotate.d/athira` |
| `deploy/backup.env.example`, `monitor.env.example` | `/etc/athira/backup.env`, `/etc/athira/monitor.env` (root 600) |
| `deploy/bin/deploy.sh`, `rollback.sh`, `backup.sh`, `restore-drill.sh`, `healthcheck.sh` | used in place |

## 1. Server hardening (once)

Keep your current session open and confirm Hostinger console access first: the firewall and SSH changes can lock you out.

1. As root: `bash deploy/bin/server-setup.sh`. It updates Ubuntu, installs Nginx, MySQL, certbot, fail2ban, restic, rclone, Node 24 LTS and PM2, sets the timezone to Asia/Dubai (the database stays UTC), creates the `deploy` (ships releases) and `athira` (runs the app, no shell) accounts, enables `ufw` (deny in; OpenSSH, 80, 443) and unattended security upgrades, and binds MySQL to `127.0.0.1`. It aborts if MySQL is listening publicly.
2. Put your SSH public key in `/home/deploy/.ssh/authorized_keys`, log in from a second terminal as `deploy`, then run `deploy/bin/lock-ssh.sh` to disable password and root SSH.
3. Verify: `ss -ltnp | grep 3306` shows only `127.0.0.1`; `ufw status verbose`; `sudo unattended-upgrade --dry-run`.

## 2. DNS and TLS

1. Point `A` (and `AAAA` only if IPv6 works end to end) for `athiraflowers.ae` and `www` at the VPS.
2. Install the Nginx files, replace the domain if it differs, then `sudo nginx -t`. The first time, comment out the two `ssl_certificate` blocks (or serve only port 80) so Nginx can start, then:
   `sudo certbot certonly --webroot -w /var/www/certbot -d athiraflowers.ae -d www.athiraflowers.ae`
3. Enable the full config and `sudo systemctl reload nginx`.
4. Prove renewal, not just issuance: `sudo certbot renew --dry-run` and `systemctl list-timers | grep certbot`.

## 3. Database

As MySQL root, once (choose real passwords; do not paste them into shell history; use `mysql_config_editor` or a file):

```sql
CREATE DATABASE athira CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'athira_app'@'127.0.0.1' IDENTIFIED BY '<app-password>';
CREATE USER 'athira_migrate'@'127.0.0.1' IDENTIFIED BY '<migrate-password>';
CREATE USER 'athira_backup'@'127.0.0.1' IDENTIFIED BY '<backup-password>';
GRANT SELECT, INSERT, UPDATE, DELETE ON athira.* TO 'athira_app'@'127.0.0.1';
GRANT ALL ON athira.* TO 'athira_migrate'@'127.0.0.1';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON athira.* TO 'athira_backup'@'127.0.0.1';
GRANT PROCESS ON *.* TO 'athira_backup'@'127.0.0.1';
```

The running app only ever gets `athira_app` (no DDL). `athira_migrate` is used by `deploy.sh` and the seed.

## 4. Secrets

* `/etc/athira/athira.env` (`root:athira`, mode 640): copy `.env.example`, fill every value. `NODE_ENV=production`, `STORAGE_DRIVER=r2`, live Stripe keys, Brevo key, `APP_SECRET` (`openssl rand -base64 48`). It must not contain `DATABASE_MIGRATE_URL`.
* `/etc/athira/migrate.env` (`root:deploy`, mode 640): only `DATABASE_MIGRATE_URL`.
* `NEXT_PUBLIC_*` values are inlined at build time, so they must be in `athira.env` when `deploy.sh` builds.
* Stripe: add a webhook endpoint `https://athiraflowers.ae/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`.
* Brevo: authenticate the sender domain (SPF, DKIM, DMARC) before launch or order emails land in spam.
* R2: bucket with a custom domain (`NEXT_PUBLIC_MEDIA_URL`), CORS allowing `PUT` from the site origin only, an API token scoped to that bucket.
* Never copy any of these files into backups, chat, tickets or git. Keep a recovery inventory in the password manager.

## 5. First release

```bash
sudo -u deploy git clone <repo-url> /srv/athira/repo
sudo -u deploy /srv/athira/repo/deploy/bin/deploy.sh main
```

`deploy.sh <ref>` builds an immutable release in `/srv/athira/releases/<timestamp>`, runs `npm ci`, `next build`, the migrations, and a smoke test on port 3001 (`/api/health`, `/en`, `/ar`). Only then does it switch the `current` symlink and `pm2 startOrReload`. If the health check fails after the switch, it points `current` back at the previous release by itself. The newest five releases are kept.

Then, once:

```bash
sudo -u athira pm2 save && sudo env PATH=$PATH pm2 startup systemd -u athira --hp /srv/athira
sudo install -m 644 /srv/athira/current/deploy/systemd/athira-* /etc/systemd/system/
sudo install -m 644 /srv/athira/current/deploy/logrotate-athira /etc/logrotate.d/athira
sudo systemctl daemon-reload
sudo systemctl enable --now athira-maintenance.timer athira-healthcheck.timer athira-backup.timer
```

Create the first owner (the seed refuses to run in production):

```bash
cd /srv/athira/current && set -a && . /etc/athira/migrate.env && set +a
npm run admin:create -- --email <owner-email> --name "<Owner name>" --role owner --out /root/owner-credentials
```

The temporary password is written to the `--out` file (mode 600) and is never printed. Read it once, sign in at `/admin/login`, set a new password, enrol two-step verification and save the recovery codes in the vault, then delete the file. Do not run `db:seed` against a live database.

## 6. Rollback

`deploy/bin/rollback.sh` (previous release) or `rollback.sh <stamp>`. Migrations are forward-only: write them expand/contract (add columns nullable or with defaults first; remove only in a later release) so the previous release still runs against the new schema. If a migration must be undone, restore from backup (section 8).

## 7. Operations

* Logs: `/var/log/athira/{out,error}.log` (rotated 14 days), Nginx logs in `/var/log/nginx/athira.*`, `journalctl -u athira-maintenance`.
* Housekeeping (`npm run maintenance`, every 5 minutes): retries unsent emails, cancels card orders unpaid after 2 hours and restores stock, purges expired OTPs, sessions, rate limits, old webhook events and abandoned uploads. It exits non-zero if any step errors.
* Monitoring (`healthcheck.sh`, every 5 minutes): public site, app health, disk below `DISK_MAX_PCT`, TLS expiry, then pings `PING_URL`. Use a dead-man's-switch service (for example healthchecks.io) so that silence, including a dead VPS, alerts you. Add an external uptime monitor on `https://athiraflowers.ae/en` too, because a probe on the server cannot report that the server is down.
* Security updates: unattended for the OS; run `npm audit --omit=dev` before each release and update the lockfile deliberately.

## 8. Backups and recovery

`backup.sh` runs daily at 03:30 Dubai time:

1. `mysqldump --single-transaction --routines --events --triggers` into a private temp file; the file is gzip-tested, size-checked and must end with the dump-completed marker, so a failed dump can never become an empty snapshot.
2. The dump goes into a **restic** repository (client-side AES-256 encryption, deduplicated) on an offsite remote that is not the media bucket and not the VPS (an rclone remote such as a dedicated Google Drive folder, or a separate object-store account). Use a backup-only account with MFA.
3. Images: `rclone sync` from the R2 media bucket to a local stage (read-only key), then restic. Object storage is not a backup by itself.
4. Non-secret config (nginx, PM2, timers) is included. `.env` files are never included.
5. Retention 14 daily, 8 weekly, 12 monthly; weekly prune; `restic check --read-data-subset=2%` every run.
6. Any failure sends a `fail` ping and an optional webhook message; a missing success ping also alerts.

Store `/etc/athira/restic.pass` in the offline vault as well. **Without it nothing can be restored.**

**Restore drill** (quarterly, and after major schema changes): on an isolated host or scratch database run `deploy/bin/restore-drill.sh`. It restores the latest snapshot into a throwaway database, compares row counts for the main tables, prints the latest order, and drops the database. Record duration and issues in the checklist.

**Disaster recovery outline**: declare an incident lead and note the time; provision and harden a clean Ubuntu host (section 1); restore the release from git and re-enter secrets from the vault; fetch and verify the backup (`restic restore`), restore the dump into MySQL, restore media to R2 if it was lost; check schema, latest orders and totals, product and stock counts and image availability; point DNS or Nginx only after smoke tests and after the Stripe webhook is confirmed on the new host; rotate any credential that may have been exposed and write the incident report.

## 9. Release checklist per deploy

1. CI green: `npm run typecheck && npm run lint && npm test`, `npm audit --omit=dev`.
2. `deploy.sh <tag>`; watch the smoke test.
3. Place a COD test order and a Stripe test-mode order on staging before the first live release; confirm the webhook, the confirmation email and the invoice PDF.
4. Check `/admin` loads with two-step verification and `/sitemap.xml` returns 200.
