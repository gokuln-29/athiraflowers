#!/usr/bin/env bash
# One-time hardening for a fresh Ubuntu LTS VPS. Run as root from the Hostinger console or a second SSH session.
# KEEP YOUR CURRENT SESSION OPEN and test a second login before closing it (the firewall and SSH changes can lock you out).
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_USER="${APP_USER:-athira}"

apt-get update && apt-get -y upgrade
apt-get -y install ufw fail2ban unattended-upgrades nginx certbot python3-certbot-nginx mysql-server git curl rclone restic logrotate
timedatectl set-timezone Asia/Dubai   # operations time; the database stores UTC regardless

# Accounts: `deploy` ships releases (has your SSH key); `athira` runs the app and owns nothing else.
id "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
id "$APP_USER"    >/dev/null 2>&1 || adduser --system --group --home /srv/athira --shell /usr/sbin/nologin "$APP_USER"
install -d -o "$DEPLOY_USER" -g "$APP_USER" -m 0750 /srv/athira /srv/athira/releases
install -d -o "$APP_USER"    -g "$APP_USER" -m 0750 /var/log/athira
install -d -o root           -g "$APP_USER" -m 0750 /etc/athira
echo "Copy your public key into /home/$DEPLOY_USER/.ssh/authorized_keys, verify login, THEN run: deploy/bin/lock-ssh.sh"

# Firewall: default deny in, SSH + web only. MySQL stays on loopback.
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Automatic security updates.
dpkg-reconfigure -f noninteractive unattended-upgrades
systemctl enable --now fail2ban

# MySQL bound to loopback only.
install -m 0644 /dev/stdin /etc/mysql/mysql.conf.d/zz-athira.cnf <<'CNF'
[mysqld]
bind-address = 127.0.0.1
skip-name-resolve
character-set-server = utf8mb4
collation-server = utf8mb4_0900_ai_ci
default-time-zone = '+00:00'
CNF
systemctl restart mysql
ss -ltn | grep ':3306' | grep -v '127.0.0.1' && { echo "MySQL is listening on a public address: fix before continuing" >&2; exit 1; } || echo "MySQL listens on loopback only"

# Node LTS (pin the major in docs/DEPLOYMENT.md) and PM2.
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get -y install nodejs
npm install -g pm2
echo "Next: create the database and users (docs/DEPLOYMENT.md section 3), then copy deploy/ files into place."
