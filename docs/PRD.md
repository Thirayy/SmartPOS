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
   * Validasi tombol dinamis dan fitur pemulihan kata sandi (*Forgot Password*).
   * Dialog konfirmasi *logout* untuk mencegah kesalahan operasional kasir.
2. **Manajemen Produk & Stok Terisolasi**:
   * Menambah, mencari, dan melihat daftar produk berdasarkan `business_id` masing-masing akun[cite: 3].
   * Pencatatan otomatis mutasi stok (*Initial Stock*, *Stock In/Out*, *Adjustment*)[cite: 3].
   * Indikator peringatan stok menipis (*Low Stock Threshold*)[cite: 3].
3. **Modul Kasir / POS (Point of Sale)**:
   * Keranjang belanja cepat, kalkulasi total otomatis, dan pemrosesan pembayaran terisolasi per toko.
4. **Pencatatan Pengeluaran & Keuangan**:
   * Modul pencatatan biaya operasional harian/bulanan toko.
5. **Pengaturan Sistem & Personalisasi**:
   * Pengaturan preferensi tampilan (Tipografi & Ukuran Teks UI).
   * Pembaruan profil akun aktif dan informasi toko secara *real-time*.
