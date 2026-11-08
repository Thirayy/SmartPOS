#!/usr/bin/env bash
# Menyiapkan data demo lalu menjalankan backend dan frontend.
# Hentikan dengan Ctrl+C.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON="$ROOT_DIR/venv/bin/python"

if [ ! -x "$PYTHON" ]; then
  echo "Virtualenv belum ada. Jalankan:"
  echo "  python3 -m venv venv"
  echo "  ./venv/bin/pip install -r backend/requirements.txt"
  exit 1
fi

if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
  echo "Dependensi frontend belum ada. Jalankan:"
  echo "  cd frontend && npm install"
  exit 1
fi

if [ ! -f "$ROOT_DIR/backend/.env" ]; then
  echo "backend/.env belum ada. Salin dulu:"
  echo "  cp backend/.env.example backend/.env"
  echo "lalu sesuaikan DATABASE_URL dan SECRET_KEY."
  exit 1
fi

"$PYTHON" "$ROOT_DIR/backend/scripts/seed_demo.py" --reset

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  if [ -n "$BACKEND_PID" ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  if [ -n "$FRONTEND_PID" ]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

echo "Menjalankan backend di http://localhost:8000 ..."
(
  cd "$ROOT_DIR/backend"
  "$PYTHON" -m uvicorn app.main:app --reload --port 8000
) &
BACKEND_PID=$!

echo "Menjalankan frontend di http://localhost:3000 ..."
(
  cd "$ROOT_DIR/frontend"
  npm run dev
) &
FRONTEND_PID=$!

echo
echo "Demo berjalan. Buka http://localhost:3000/auth/login"
echo "Tekan Ctrl+C untuk menghentikan kedua server."

wait
