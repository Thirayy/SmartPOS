## 2. Product Requirement Document (PRD)

### A. Informasi Umum Produk
* **Nama Produk**: SmartPOS MVP (UMKM Master)
* **Target Pengguna**: Pemilik Usaha (Owner), Manajer Toko, dan Kasir.
* **Tech Stack**:
  * *Frontend*: Next.js App Router, Tailwind CSS, TypeScript, Lucide Icons.
  * *Backend*: FastAPI (Python), SQLAlchemy, PostgreSQL (dengan dukungan multi-tenant query filtering[cite: 3]).
  * *Sesi & State*: `localStorage` untuk manajemen token dan sesi `business_id` aktif.

### B. Daftar Fitur Utama (Core Features)
1. **Autentikasi & Multi-Akun**:
   * Halaman Login dan Registrasi akun baru dengan pemisahan ID Bisnis otomatis[cite: 3].
   * Validasi tombol dinamis. Pemulihan kata sandi lewat email **belum tersedia**;
     pengguna dapat mengganti sandi setelah login.
   * Dialog konfirmasi *logout* untuk mencegah kesalahan operasional kasir.
2. **Manajemen Produk & Stok Terisolasi**:
   * Menambah, mencari, mengubah, dan menonaktifkan produk berdasarkan `business_id` masing-masing akun[cite: 3].
   * Pencatatan otomatis mutasi stok (*Initial Stock*, *Stock In/Out*, *Adjustment*)[cite: 3].
   * Indikator peringatan stok menipis (*Low Stock Threshold*)[cite: 3].
3. **Modul Kasir / POS (Point of Sale)**:
   * Keranjang belanja cepat, kalkulasi total otomatis, dan pemrosesan pembayaran terisolasi per toko.
   * Pembayaran tunai dicatat sebagai diterima. Transfer hanya dicatat metodenya;
     belum ada verifikasi bank/QRIS atau status MENUNGGU/GAGAL.
4. **Pencatatan Pengeluaran & Keuangan**:
   * Modul pencatatan biaya operasional harian/bulanan toko, termasuk edit/hapus dan filter periode.
   * Dashboard menampilkan agregat seluruh data atau rentang tanggal tertentu
     (Dari/Sampai) dan hanya dapat diakses owner/manajer.
5. **Peran, Shift, dan Jejak Audit**:
   * Anggota bisnis dengan peran OWNER/MANAGER/CASHIER; owner dapat mengundang,
     mengubah peran, dan menonaktifkan anggota.
   * Buka/tutup shift dengan kas awal, kas aktual, dan selisih kas.
   * Batal/retur penuh dengan alasan, pengembalian stok, dan pencatatan pelaku.
   * Audit trail nilai sebelum/sesudah untuk perubahan produk, stok, pengeluaran,
     penjualan, dan shift.
6. **Riwayat Transaksi**:
   * Daftar transaksi dengan filter tanggal/metode/status dan nama kasir.
7. **Pengaturan Sistem & Personalisasi**:
   * Pengaturan preferensi tampilan (Tipografi & Ukuran Teks UI).
   * Pembaruan profil akun aktif dan informasi toko (tab toko hanya untuk owner).

### C. Batas MVP (jangan diklaim sebagai fitur tersedia)

* Retur sebagian dan refund terintegrasi penyedia pembayaran belum ada; batal/retur
  saat ini berlaku penuh dan mengembalikan stok.
* Preset periode, ekspor CSV/Excel/PDF, dan perbandingan periode belum ada.
* Migrasi database (Alembic) belum aktif; skema masih dibuat lewat
  `Base.metadata.create_all`. Backup manual tersedia di `scripts/backup_db.sh`,
  tetapi penjadwalan, uji pemulihan, dan monitoring belum ada.
* Printer struk, barcode scanner, mode offline, multi-cabang, dan integrasi
  pembayaran belum diuji atau belum tersedia.
* Analisis AI bersifat opsional dan bukan laporan akuntansi resmi.
* Token sesi disimpan di `localStorage`; cookie HttpOnly + CSRF belum diterapkan.
