# Roadmap SmartPOS MVP

Dokumen ini mencerminkan kondisi kode saat ini, bukan target yang sudah selesai.
Centang hanya fitur yang benar-benar ada di repository dan sudah diuji.

## Ringkasan status

| Modul | Status | Catatan |
| --- | --- | --- |
| Auth & multi-bisnis | Selesai (dasar) | Register, login JWT, profil, ganti sandi. Setiap endpoint bisnis memakai `authorize_business_access`. |
| Produk & stok | Selesai (dasar) | Tambah, daftar, edit, nonaktifkan, penyesuaian stok, dan mutasi. Belum ada pemasok atau purchase order. |
| POS & checkout | Selesai (dasar) | Keranjang, diskon, tunai/transfer, struk. Checkout memakai lock baris produk dan `idempotency_key`. |
| Riwayat transaksi | Selesai (dasar) | Daftar, detail struk, filter tanggal/metode/status, serta batal/retur dengan alasan. |
| Pengeluaran | Selesai (dasar) | Kategori, nominal, tanggal, deskripsi, filter periode, edit, dan hapus. |
| Dashboard | Sebagian | Omzet, transaksi, HPP, laba kotor, pengeluaran, estimasi hasil operasional, produk terlaris. Filter rentang tanggal tersedia. |
| Laporan per periode | Sebagian | Filter rentang tanggal (Dari/Sampai) di dashboard, daftar transaksi, dan daftar pengeluaran dengan batas hari `APP_TIMEZONE`. Belum ada preset atau ekspor. |
| Peran & hak akses | Selesai (dasar) | `business_members` OWNER/MANAGER/CASHIER, kelola anggota, dan pembatasan modul di backend + navigasi frontend. |
| Shift & rekonsiliasi kas | Selesai (dasar) | Buka/tutup shift, kas awal, kas aktual, selisih, dan daftar shift. |
| Batal/retur/refund | Selesai (dasar) | Batal/retur penuh: status `CANCELLED`, stok dikembalikan, alasan dan pelaku dicatat. Belum ada retur sebagian atau refund terintegrasi. |
| Audit trail | Selesai (dasar) | Perubahan produk, stok, pengeluaran, penjualan, dan shift tercatat dengan nilai sebelum/sesudah. |
| Migrasi database | Belum | Masih `Base.metadata.create_all` saat startup. Kerangka Alembic ada tetapi `script_location` belum dikonfigurasi. |
| Backup otomatis | Sebagian | `scripts/backup_db.sh` (pg_dump + retensi) tersedia. Penjadwalan cron belum diuji. |
| Test otomatis | Sebagian | 12 test backend lulus: checkout, stok, idempotensi, konkurensi, diskon, filter laporan, isolasi bisnis, dan otorisasi. Belum ada test shift/anggota/audit, frontend, atau end-to-end. |
| AI | Sebagian | Endpoint sudah diotorisasi per bisnis dan opsional. Bukan laporan akuntansi. |
| Ekspor, pembayaran terintegrasi, perangkat keras, multi-cabang, offline | Belum | Jangan diklaim sampai diuji end-to-end. |

## Fase 1 — Fondasi (selesai)

- [x] Struktur database multi-bisnis dengan filter `business_id`.
- [x] Login frontend menyimpan token dan `business_id` aktif di `localStorage`.
- [x] UI dasar login/register, navigasi dashboard, konfirmasi logout.
- [x] Otorisasi bisnis pada modul produk, penjualan, pengeluaran, laporan, dan AI.

## Fase 2 — POS, stok, dan pengeluaran (selesai untuk MVP)

- [x] POS terhubung ke database dengan `business_id` aktif.
- [x] Pengurangan stok dan mutasi `SALE` tercatat dalam satu transaksi database.
- [x] Stok awal (`STOCK_IN`) dan penyesuaian stok manual.
- [x] Pencatatan pengeluaran dengan kategori dan tanggal.
- [x] Riwayat transaksi dan struk yang bisa dibuka kembali.
- [x] Validasi backend untuk stok, diskon, nominal diterima, metode pembayaran, dan item kosong.
- [x] `idempotency_key` pada checkout untuk mencegah transaksi ganda akibat retry.
- [x] Kunci baris produk (`SELECT ... FOR UPDATE`) agar dua checkout tidak menjual stok yang sama.
- [x] Dashboard agregat dan produk terlaris.

## Fase 3 — Kesiapan demo (fokus saat ini)

- [x] README setup dari clone sampai berjalan.
- [x] Template `backend/.env.example` dan `frontend/.env.example`.
- [x] Seed data demo yang konsisten dan bisa direset.
- [x] Script demo (`scripts/demo.sh`, `docs/DEMO.md`).
- [x] Test transaksi sukses, stok kurang, checkout ganda, diskon, keranjang kosong.
- [x] Test isolasi data antarbisnis.
- [x] Menyembunyikan/ memindahkan file cache, virtualenv, dan data lokal dari Git.
- [x] Menyesuaikan klaim landing page dan dashboard dengan batas MVP.
- [ ] Uji manual di laptop dan tablet yang akan dipakai demo.
- [ ] Uji alur transfer dan jelaskan verifikasi manual kepada calon pengguna.

## Fase 4 — Sebelum pilot di toko

Prioritas tinggi, berurutan:

1. **Hak akses**
   - [x] Tabel keanggotaan bisnis (`business_members`) dengan peran owner/manajer/kasir.
   - [x] Undang/nonaktifkan akun karyawan dari halaman Anggota.
   - [x] Batasi modul: kasir hanya POS/riwayat/shift/setelan pribadi; manajer produk/stok/laporan operasional; owner semua.
   - [x] Catat `cashier_user_id` dan tampilkan nama kasir di riwayat.
   - [x] Test akses: kasir tidak bisa membuka fungsi owner, pengguna tidak bisa membuka bisnis lain.

2. **Laporan per periode**
   - [x] Filter rentang tanggal (Dari/Sampai) di dashboard.
   - [ ] Preset hari ini, kemarin, minggu ini, dan bulan ini.
   - [x] Filter tanggal di daftar transaksi dan pengeluaran.
   - [x] Definisikan omzet, HPP, laba kotor, pengeluaran, dan hasil operasional secara eksplisit di UI.
   - [x] Kecualikan transaksi batal/retur dari penjualan (laporan hanya menghitung `COMPLETED`).
   - [x] Test perhitungan laporan terhadap rentang tanggal.

3. **Pembatalan, retur, dan rekonsiliasi**
   - [x] Endpoint pembatalan/retur dengan alasan, izin, dan audit.
   - [x] Kembalikan stok dan sesuaikan laporan secara konsisten.
   - [x] Buka/tutup shift, uang awal, kas aktual, dan selisih kas.

4. **Audit dan pengeluaran**
   - [x] Riwayat perubahan harga, stok, pengeluaran, penjualan, dan shift.
   - [x] Edit/hapus pengeluaran dengan jejak perubahan.

5. **Keandalan**
   - [ ] Alembic untuk migrasi skema (kerangka ada, konfigurasi belum lengkap).
   - [x] Script backup `pg_dump` dengan retensi; penjadwalan dan uji pemulihan masih pending.
   - [ ] Penanganan kegagalan koneksi dan pesan error yang konsisten.
   - [ ] Monitoring error (mis. Sentry) dan log transaksi kunci.

6. **Pengujian**
   - [ ] Test frontend untuk validasi form dan status pembayaran.
   - [ ] Test end-to-end (Playwright) dari login sampai checkout.
   - [ ] Checklist regresi setiap perubahan POS/stok.
   - [x] CI (GitHub Actions) untuk lint/build frontend dan test backend.

## Fase 5 — Pengembangan lanjutan

- [ ] Ekspor laporan CSV/Excel, lalu PDF setelah format stabil.
- [ ] Stok masuk dari pemasok dan purchase order.
- [ ] Integrasi QRIS/transfer dengan penyedia pembayaran dan status transaksi.
- [ ] Printer struk dan barcode scanner yang benar-benar diuji.
- [ ] Multi-cabang.
- [ ] Mode offline dan sinkronisasi.
- [ ] Cookie HttpOnly + CSRF untuk sesi yang lebih aman.

## Aturan klaim

- Jangan menyebut fitur di Fase 4–5 sebagai "tersedia" sebelum ada di kode dan lulus test.
- Jangan menyebut angka dashboard sebagai "laba bersih".
- Jangan menyebut transfer/QRIS "terverifikasi" tanpa integrasi penyedia pembayaran.
- Data demo harus diberi label ilustrasi dan tidak boleh memakai data pelanggan nyata.
