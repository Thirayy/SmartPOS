#!/usr/bin/env bash
# Backup harian database SmartPOS.
# Jalankan manual atau tambahkan ke cron, mis. setiap hari pukul 02:00:
#   0 2 * * * /path/ke/smartpos/scripts/backup_db.sh
#
# Sumber koneksi: variabel DATABASE_URL (environment) atau backend/.env.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${HOME}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"

if [ -f "$ROOT_DIR/backend/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/backend/.env"
  set +a
fi

DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/smartpos_db}"
# pg_dump hanya menerima skema URL tanpa driver SQLAlchemy.
PG_URL="${DATABASE_URL/postgresql+psycopg:\/\//postgresql:\/\/}"
PG_URL="${PG_URL/postgresql+asyncpg:\/\//postgresql:\/\/}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump tidak ditemukan. Instal paket postgresql-client." >&2
  exit 1
fi

TIMESTAMP="$(date +%F_%H%M%S)"
DEST_FILE="${BACKUP_DIR}/smartpos-${TIMESTAMP}.dump"

pg_dump "$PG_URL" \
  --format=custom --no-owner --clean --if-exists \
  --file="$DEST_FILE"

echo "Backup disimpan di $DEST_FILE"

if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && [ "$RETENTION_DAYS" -gt 0 ]; then
  find "$BACKUP_DIR" -name 'smartpos-*.dump' -type f -mtime "+${RETENTION_DAYS}" -delete
fi
