#!/usr/bin/env bash
# One-time Ubuntu 22.04/24.04 provisioning. Run as root on a fresh Hostinger VPS:
#   sudo bash provision.sh
# KEEP YOUR CURRENT SSH SESSION OPEN and test a second login before closing it.
# Password SSH login is only disabled when DISABLE_SSH_PASSWORDS=1 AND an
# authorized_keys file exists for the deploy user.
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "run as root"; exit 1; }

apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y upgrade
DEBIAN_FRONTEND=noninteractive apt-get -y install \
  nginx certbot mysql-server ufw fail2ban unattended-upgrades curl git ca-certificates \
  restic rclone logrotate

# Node.js LTS (pin the major; keep in sync with the version you build/test with).
if ! command -v node >/dev/null || ! node -v | grep -q '^v22'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get -y install nodejs
fi

timedatectl set-timezone Asia/Dubai   # logs/cron in local time; the DB stores UTC.

# Service account (no login) and deploy user.
id athira >/dev/null 2>&1 || useradd --system --home /srv/athira --shell /usr/sbin/nologin athira
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG athira deploy
install -d -o deploy -g athira -m 0755 /srv/athira /srv/athira/releases
install -d -o athira -g athira -m 0750 /var/cache/athira
install -d -o root -g athira -m 0750 /etc/athira
install -d -m 0755 /var/www/certbot /var/log/athira
echo 'deploy ALL=(root) NOPASSWD: /bin/systemctl restart athira, /bin/systemctl status athira' > /etc/sudoers.d/athira
chmod 440 /etc/sudoers.d/athira

# Firewall: default-deny inbound; 3306 is never opened.
ufw default deny incoming
ufw default allow outgoing
if [ -n "${SSH_ALLOW_FROM:-}" ]; then ufw allow from "$SSH_ALLOW_FROM" to any port 22 proto tcp
else ufw allow OpenSSH; fi
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Automatic security updates (+ reboot window for kernel fixes).
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
CONF
cat > /etc/apt/apt.conf.d/52athira-unattended <<'CONF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
CONF

# SSH hardening (drop-in; reload only after validating).
cat > /etc/ssh/sshd_config.d/99-athira.conf <<'CONF'
PermitRootLogin prohibit-password
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
CONF
if [ "${DISABLE_SSH_PASSWORDS:-0}" = "1" ]; then
  if [ -s /home/deploy/.ssh/authorized_keys ] || [ -s /root/.ssh/authorized_keys ]; then
    echo 'PasswordAuthentication no' >> /etc/ssh/sshd_config.d/99-athira.conf
  else echo "NOT disabling SSH passwords: no authorized_keys found."; fi
fi
sshd -t && systemctl reload ssh

systemctl enable --now fail2ban unattended-upgrades

# MySQL: loopback only (config copied from the repo), then verify.
install -m 0644 "$(dirname "$0")/../mysql/athira.cnf" /etc/mysql/mysql.conf.d/athira.cnf
systemctl restart mysql
if ss -ltn | grep ':3306' | grep -vq '127.0.0.1'; then echo "ERROR: MySQL is listening on a public address"; exit 1; fi

# Headless Chrome for invoice PDFs (Arabic text needs a real browser engine).
DEBIAN_FRONTEND=noninteractive apt-get -y install libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 \
  fonts-noto-core 2>/dev/null || echo "NOTE: some Chrome libraries have different names on this Ubuntu release; install what apt reports missing."
if [ ! -d /opt/athira-chrome ]; then
  install -d -m 0755 /opt/athira-chrome
  npx --yes @puppeteer/browsers install chrome@stable --path /opt/athira-chrome
fi
echo "Set CHROME_PATH in /etc/athira/env to: $(find /opt/athira-chrome -type f -name chrome -perm -u+x | head -1)"

echo "Done. Next: create DB users (deploy/mysql/create-users.sql), write /etc/athira/env,"
echo "install nginx config + snippet, certbot, systemd units, backup + monitoring (see docs/DEPLOYMENT.md)."
