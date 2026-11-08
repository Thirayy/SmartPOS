# Backend SmartPOS

API FastAPI untuk SmartPOS. Setup lengkap dari clone sampai aplikasi berjalan ada
di [README utama](../README.md).

## Menjalankan

```bash
# dari root repository
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

cp backend/.env.example backend/.env
# edit DATABASE_URL dan SECRET_KEY di backend/.env

cd backend
../venv/bin/uvicorn app.main:app --reload --port 8000
```

Backend selalu membaca `backend/.env`, terlepas dari direktori kerja proses.
Jika konfigurasi wajib belum lengkap, backend berhenti dengan pesan yang
menyebutkan field yang kurang. `DATABASE_URL` harus PostgreSQL.

Tabel dibuat otomatis saat startup (`Base.metadata.create_all`) dan ada
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` untuk kolom profil. Ini **belum**
migrasi terkelola; Alembic belum dipakai. Jangan andalkan cara ini untuk
perubahan skema produksi.

## Konfigurasi

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Ya | Contoh: `postgresql://postgres:postgres@localhost:5432/smartpos_db`. |
| `SECRET_KEY` | Ya | Minimal 32 karakter. Jangan commit nilainya. |
| `ALGORITHM` | Tidak | Default `HS256`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Tidak | Default 1440. |
| `CORS_ORIGINS` | Tidak | JSON array, default `["http://localhost:3000"]`. |
| `AI_API_KEY` | Tidak | Jika kosong, endpoint AI mengembalikan error eksplisit. |
| `AI_BASE_URL`, `AI_MODEL` | Tidak | Penyedia chat-completions kompatibel OpenAI. |

Jangan commit `backend/.env`. Template ada di `backend/.env.example`.

## Data demo

```bash
# dari root repository
./venv/bin/python backend/scripts/seed_demo.py --reset
```

Akun demo: `owner@demo.smartpos.id` / `DemoSmartPOS123!`. Alur demo ada di
[docs/DEMO.md](../docs/DEMO.md).

## Test

```bash
pip install -r backend/requirements-dev.txt
cd backend
../venv/bin/python -m pytest -q
```

Test membuat database `smartpos_db_test` secara otomatis dari `DATABASE_URL`.
Pastikan pengguna PostgreSQL berhak membuat database. Untuk memakai database
test lain, set `TEST_DATABASE_URL` (database harus sudah ada).

Cakupan saat ini: checkout sukses, stok tidak cukup, produk tidak aktif,
checkout ganda dengan `idempotency_key`, diskon melebihi subtotal, keranjang
kosong, dan isolasi data antarbisnis.

## Otorisasi

Semua router bisnis memakai dependency `authorize_business_access`, termasuk
`/businesses/{business_id}/ai`. Endpoint bisnis memerlukan header
`Authorization: Bearer <token>` dan hanya mengizinkan pemilik bisnis tersebut.

Peran owner/manajer/kasir dan akun karyawan **belum** diimplementasikan.
