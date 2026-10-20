-- Run ONCE as MySQL root on the VPS:  sudo mysql < create-users.sql
-- Replace the three CHANGE_ME values with long random passwords (e.g. openssl rand -base64 32)
-- and put them in /etc/athira/env (app, migrate) and /etc/athira/backup.cnf (backup).
CREATE DATABASE IF NOT EXISTS athira CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Runtime user: data access only. No DDL, no FILE, no GRANT, localhost only.
CREATE USER IF NOT EXISTS 'athira_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_APP';
GRANT SELECT, INSERT, UPDATE, DELETE ON athira.* TO 'athira_app'@'localhost';

-- Schema owner: used only by deploy/scripts/deploy.sh to run migrations.
CREATE USER IF NOT EXISTS 'athira_migrate'@'localhost' IDENTIFIED BY 'CHANGE_ME_MIGRATE';
GRANT ALL PRIVILEGES ON athira.* TO 'athira_migrate'@'localhost';
-- The last-owner protection triggers are created by migrations.

-- Backup user: read-only dump privileges.
CREATE USER IF NOT EXISTS 'athira_backup'@'localhost' IDENTIFIED BY 'CHANGE_ME_BACKUP';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT ON athira.* TO 'athira_backup'@'localhost';

FLUSH PRIVILEGES;
