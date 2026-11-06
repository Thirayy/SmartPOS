### 🚀 Fase 1: Fondasi Multi-Tenant & Autentikasi (Selesai Saat Ini)
* [x] Implementasi struktur database FastAPI dengan filter `business_id`[cite: 3].
* [x] Pembuatan sistem sesi login frontend yang menyimpan `business_id` unik ke `localStorage`.
* [x] Standardisasi UI/UX (Tombol kembali, konfirmasi *logout*, form login/register).

### 🛠️ Fase 2: Integrasi Modul Transaksi POS & Pengeluaran (Fase Berjalan)
* [ ] Menghubungkan keranjang kasir (*POS*) ke endpoint database dengan menyertakan `business_id` aktif.
* [ ] Sinkronisasi otomatis pengurangan stok produk secara *real-time* saat transaksi pembayaran kasir berhasil dilakukan.
* [ ] Pembuatan grafik ringkasan pendapatan harian dan mingguan di halaman *Dashboard* utama.

### 📈 Fase 3: Laporan Keuangan & Ekspor Data
* [ ] Pengembangan halaman laporan laba-rugi sederhana per periode waktu.
* [ ] Fitur ekspor laporan transaksi dan stok ke format PDF / Excel untuk kebutuhan pembukuan UMKM.
* [ ] Optimalisasi performa kueri database dengan *indexing* pada kolom `business_id`.
