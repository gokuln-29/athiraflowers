#!/usr/bin/env bash
# Disable SSH password logins and root login. Only run AFTER confirming key login works in a second session.
set -euo pipefail
install -m 0644 /dev/stdin /etc/ssh/sshd_config.d/99-athira.conf <<'CONF'
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
MaxAuthTries 3
CONF
sshd -t && systemctl reload ssh
echo "SSH hardened. Test a fresh login before closing this session."
