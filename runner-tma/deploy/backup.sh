#!/usr/bin/env bash
# Backup en caliente de SQLite (seguro aunque el juego esté corriendo).
# Cron diario:  0 4 * * * /opt/heist-runner/deploy/backup.sh >> /var/log/heist-backup.log 2>&1
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/heist-runner}"
DB="$APP_DIR/data/game.sqlite"
DEST="$APP_DIR/backups"
mkdir -p "$DEST"
STAMP=$(date +%Y%m%d-%H%M%S)
sqlite3 "$DB" ".backup '$DEST/game-$STAMP.sqlite'"
gzip "$DEST/game-$STAMP.sqlite"
# Conservar los últimos 14 backups
ls -1t "$DEST"/game-*.sqlite.gz | tail -n +15 | xargs -r rm --
echo "[$(date)] backup ok: game-$STAMP.sqlite.gz"
