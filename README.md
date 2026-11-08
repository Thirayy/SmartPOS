# SmartPOS MVP

Aplikasi point-of-sale (POS) berbasis web untuk UMKM: katalog produk, keranjang,
checkout, riwayat transaksi, stok, pengeluaran, dan ringkasan keuangan.

Status: **MVP untuk demo dan pilot terbatas**, bukan sistem akuntansi lengkap.
Baca [batas kemampuan MVP](#batas-kemampuan-mvp) sebelum memakai data toko nyata
atau membuat klaim promosi.

## Fitur yang sudah ada

- Registrasi akun owner + bisnis, login JWT, profil, ganti kata sandi, foto profil.
- Produk: tambah, cari, daftar, harga modal/jual, stok, batas stok menipis.
- Stok: mutasi `STOCK_IN`, `STOCK_OUT`, `ADJUSTMENT`, dan mutasi otomatis `SALE`.
- POS: cari nama/SKU, filter stok, tambah/kurangi/hapus item, diskon, total,
  pembayaran tunai/transfer, uang diterima, kembalian, struk ringkas.
- Checkout: validasi stok di backend, penguncian baris produk, dan
  `idempotency_key` agar request ulang tidak membuat transaksi ganda. Frontend
  membuat key unik per percobaan checkout; kirim ulang key yang sama hanya untuk
  retry request yang sama.
- Riwayat transaksi dan detail struk yang bisa dibuka kembali.
- Pengeluaran: kategori, nominal, tanggal, deskripsi.
- Dashboard: omzet, jumlah transaksi, HPP, laba kotor, pengeluaran, estimasi
  hasil operasional, dan 5 produk terlaris. Bisa difilter dengan rentang tanggal
  (Dari/Sampai) atau seluruh data.
- Analisis AI opsional (butuh `AI_API_KEY`) dengan otorisasi per bisnis.

## Batas kemampuan MVP

| Area | Kondisi saat ini |
| --- | --- |
| Pembayaran | Tunai dicatat sebagai pembayaran diterima. Transfer hanya dicatat **metodenya**; tidak ada verifikasi bank/QRIS, tidak ada status MENUNGGU/GAGAL. Semua checkout tersimpan `COMPLETED`. |
| Laporan | Dashboard punya filter rentang tanggal (batas hari mengikuti `APP_TIMEZONE`). Belum ada preset hari/minggu/bulan, filter di daftar transaksi/pengeluaran, ekspor CSV/Excel, atau perbandingan periode. |
| Istilah keuangan | "Hasil operasional" = laba kotor dikurangi pengeluaran tercatat. Bukan laba bersih akuntansi; belum termasuk pajak, penyusutan, dan biaya lain. |
| Peran & akses | Kolom `role` ada, tetapi akun karyawan, peran owner/manajer/kasir, dan pembatasan modul **belum diimplementasikan**. Semua akses bisnis saat ini terikat ke pemilik (`owner_user_id`). |
| Shift & kas | Belum ada buka/tutup shift, uang awal, hitung kas akhir, atau selisih kas. |
| Batal/retur | Belum ada endpoint pembatalan, retur, refund, atau alasan perubahan. Status `CANCELLED` ada di model tetapi belum dipakai. |
| Stok masuk | Belum ada pencatatan pemasok/purchase order. Barang masuk memakai penyesuaian stok manual. |
| Audit | Belum ada jejak nilai sebelum/sesudah untuk perubahan harga, stok, pengeluaran, atau pengaturan akun. |
| Migrasi DB | Tabel dibuat otomatis saat startup (`Base.metadata.create_all`). Alembic belum dipakai. |
| Backup | Belum ada backup otomatis. Prosedur manual ada di bawah. |
| Perangkat | Belum diuji untuk printer struk, barcode scanner, atau mode offline. |
| Keamanan sesi | Token disimpan di `localStorage` (risiko XSS). Cookie HttpOnly + CSRF belum diterapkan. |
| Pemulihan password | Reset lewat email belum tersedia; UI hanya menjelaskan bahwa pengguna dapat mengganti sandi setelah login. |
| AI | Opsional, bukan laporan akuntansi resmi, dan tidak boleh dijadikan dasar keputusan tanpa verifikasi. |
| Multi-cabang | Belum didukung. |

## Tech stack

- Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.
- Backend: FastAPI, SQLAlchemy 2, Pydantic 2, PostgreSQL.
- Auth: JWT (python-jose) + bcrypt (passlib).
- AI: penyedia chat-completions yang kompatibel OpenAI (opsional).

## Struktur repository

```text
backend/            API FastAPI
  app/              modul auth, businesses, products, sales, expenses, reports, ai
  scripts/          seed data demo
  tests/            test backend (pytest)
frontend/           aplikasi Next.js
  src/app/          halaman landing, auth, dashboard, POS, transaksi, dll.
  src/lib/          klien API dan util
docs/               PRD, roadmap, script demo
scripts/demo.sh     seed + jalankan backend & frontend
```

## Setup dari clone sampai aplikasi berjalan

### 1. Prasyarat

- Python 3.12+
- Node.js 20+ dan npm
- PostgreSQL 14+ yang berjalan di lokal

### 2. Siapkan database

```bash
sudo -u postgres psql -c "CREATE DATABASE smartpos_db;"
```

Jika nama pengguna/password PostgreSQL berbeda, sesuaikan `DATABASE_URL` nanti.

### 3. Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

cp backend/.env.example backend/.env
```

Edit `backend/.env`:

- `DATABASE_URL`: contoh `postgresql://postgres:postgres@localhost:5432/smartpos_db`
- `SECRET_KEY`: minimal 32 karakter. Buat nilai acak:
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(48))"
  ```

Jalankan:

```bash
cd backend
../venv/bin/uvicorn app.main:app --reload --port 8000
```

Cek:

```bash
curl http://localhost:8000/
# {"message":"Welcome to SmartPOS MVP API","status":"active"}
```

Tabel database dibuat otomatis saat startup. Ini cukup untuk demo, tetapi belum
menggantikan migrasi database yang terkelola.

### 4. Frontend

Di terminal lain, dari root repository:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`. Jika backend tidak di `localhost:8000`, ubah
`NEXT_PUBLIC_API_URL` di `frontend/.env.local`.

### 5. Akun pertama

1. Buka `http://localhost:3000/auth/register` atau tombol **Daftar Akun Baru**.
2. Isi nama, email, nama usaha, dan kata sandi.
3. Setelah masuk, tambahkan produk di menu **Produk**, lalu buka **Kasir**.

## Data demo dan script demo

Cara tercepat:

```bash
./scripts/demo.sh
```

Script membuat ulang data demo, lalu menjalankan backend dan frontend. Akun demo:

- Email: `owner@demo.smartpos.id`
- Password: `DemoSmartPOS123!`

Alur demo lengkap, angka yang diharapkan, dan hal yang tidak boleh diklaim ada di
[docs/DEMO.md](docs/DEMO.md). Untuk hanya mengisi data demo:

```bash
./venv/bin/python backend/scripts/seed_demo.py --reset
```

## Test

```bash
pip install -r backend/requirements-dev.txt
cd backend
../venv/bin/python -m pytest -q
```

Test akan otomatis membuat database `smartpos_db_test` (nama diturunkan dari
`DATABASE_URL`). Test mencakup:

- checkout sukses dan pengurangan stok,
- stok tidak cukup tanpa mengubah data,
- produk tidak aktif,
- checkout ganda dengan `idempotency_key` yang sama,
- dua checkout bersamaan untuk stok terakhir,
- diskon melebihi subtotal,
- keranjang kosong,
- filter laporan berdasarkan rentang tanggal,
- isolasi data antarbisnis dan proteksi endpoint AI.

## Konfigurasi

| Variabel | Lokasi | Wajib | Keterangan |
| --- | --- | --- | --- |
| `DATABASE_URL` | `backend/.env` | Ya | Harus PostgreSQL. |
| `SECRET_KEY` | `backend/.env` | Ya | Minimal 32 karakter. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `backend/.env` | Tidak | Default 1440 menit. |
| `CORS_ORIGINS` | `backend/.env` | Tidak | JSON array, default `["http://localhost:3000"]`. |
| `APP_TIMEZONE` | `backend/.env` | Tidak | Zona waktu batas tanggal laporan, default `Asia/Jakarta`. |
| `AI_API_KEY` | `backend/.env` | Tidak | Jika kosong, analisis AI mengembalikan error eksplisit. |
| `AI_BASE_URL`, `AI_MODEL` | `backend/.env` | Tidak | Endpoint/model penyedia AI. |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Tidak | Default `http://localhost:8000/api/v1`. |

Jangan commit file `.env` atau nilai rahasia. Template hanya ada di
`backend/.env.example` dan `frontend/.env.example`.

## Ringkasan API

Semua endpoint di bawah prefix `/api/v1`. Endpoint bisnis memerlukan header
`Authorization: Bearer <token>`.

| Method | Path | Keterangan |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | Daftar / masuk. |
| GET/PATCH | `/auth/me`, `/auth/password` | Profil dan ganti sandi. |
| GET/PATCH | `/businesses/{id}` | Informasi bisnis. |
| GET/POST | `/businesses/{id}/products` | Daftar / tambah produk. |
| POST | `/businesses/{id}/products/{product_id}/adjust` | Penyesuaian stok. |
| POST | `/businesses/{id}/sales/checkout` | Checkout POS. |
| GET | `/businesses/{id}/sales`, `/sales/{sale_id}` | Riwayat dan detail struk. |
| GET/POST | `/businesses/{id}/expenses` | Daftar / tambah pengeluaran. |
| GET | `/businesses/{id}/reports/dashboard` | Ringkasan keuangan; query opsional `start_date` dan `end_date` (`YYYY-MM-DD`). |
| POST | `/businesses/{id}/ai/analyze` | Analisis AI (butuh otorisasi bisnis). |

## Backup dan pemulihan (manual)

Backup:

```bash
pg_dump "postgresql://postgres:postgres@localhost:5432/smartpos_db" \
  --format=custom --file=backups/smartpos-$(date +%F).dump
```

Pemulihan ke database kosong:

```bash
createdb smartpos_restore
pg_restore --dbname=smartpos_restore --clean --if-exists backups/smartpos-YYYY-MM-DD.dump
```

Uji pemulihan secara berkala. Jangan hanya mengandalkan backup yang belum pernah
dicoba dipulihkan.

## Roadmap

Prioritas berikutnya ada di [docs/roadmap.md](docs/roadmap.md). Urutan besarnya:

1. Stabilkan demo & pengujian transaksi.
2. Hak akses owner/manajer/kasir dan pembatasan modul.
3. Laporan per periode lanjutan: preset, rekonsiliasi, dan validasi perhitungan.
4. Pembatalan/retur, shift, rekonsiliasi kas.
5. Migrasi database (Alembic), backup terjadwal, monitoring.
6. Ekspor laporan, integrasi pembayaran, perangkat keras, multi-cabang, offline.

## Lisensi

Belum ditentukan.
