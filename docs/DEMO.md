# Script Demo SmartPOS MVP

Dokumen ini adalah alur demo yang bisa diulang. Semua data bersifat fiktif dan
hanya untuk demonstrasi. Jalankan seluruh langkah sebelum promosi atau presentasi.

## 1. Siapkan data demo

Dari root repository:

```bash
./scripts/demo.sh
```

Script akan:

1. Menghapus data demo lama (hanya akun `owner@demo.smartpos.id`).
2. Membuat bisnis "Toko Demo SmartPOS", 6 produk, stok awal, dan 1 pengeluaran.
3. Menjalankan backend di `http://localhost:8000`.
4. Menjalankan frontend di `http://localhost:3000`.

Jika ingin menyiapkan data saja tanpa menjalankan server:

```bash
./venv/bin/python backend/scripts/seed_demo.py --reset
```

Akun demo:

| Peran | Email | Password |
| --- | --- | --- |
| Owner (satu-satunya akun yang didukung saat ini) | `owner@demo.smartpos.id` | `DemoSmartPOS123!` |

> Catatan: akun kasir/manajer terpisah **belum didukung**. Kolom `role` ada di
> database, tetapi belum ada alur undang karyawan atau pembatasan modul.
> Gunakan akun owner untuk demo POS dan jangan mengklaim dukungan multi-peran.

## 2. Alur demo (sekitar 5 menit)

### Langkah 1 — Login owner

1. Buka `http://localhost:3000/auth/login`.
2. Masuk dengan akun demo di atas.
3. Buka **Dashboard**.

Yang dijelaskan:

- Tanpa filter, dashboard mengakumulasi **seluruh transaksi** dan menampilkan
  badge "Semua data". Filter **Dari/Sampai** tersedia untuk membatasi periode.
- Sebelum ada penjualan: omzet `Rp 0`, transaksi `0`, HPP `Rp 0`, laba kotor
  `Rp 0`, pengeluaran `Rp 20.000`, hasil operasional **-Rp 20.000**.
- "Hasil operasional" adalah estimasi laba kotor dikurangi pengeluaran tercatat,
  bukan laba bersih akuntansi.

### Langkah 2 — Buka POS dan periksa stok awal

1. Buka **Kasir**.
2. Cari "Kopi" atau gunakan filter stok.
3. Catat stok awal:
   - Kopi Susu Gula Aren: **40**
   - Roti Bakar Cokelat: **25**
   - Keripik Singkong: **6** (stok menipis)
   - Nasi Goreng Spesial: **0** (habis, untuk demo kegagalan)

### Langkah 3 — Transaksi sukses

1. Tambahkan **Kopi Susu Gula Aren ×5**.
2. Tambahkan **Roti Bakar Cokelat ×2**.
3. Isi diskon **10.000**.
4. Klik **Bayar sekarang**.
5. Pilih **Tunai**, isi uang diterima **150.000**.
6. Periksa:
   - Subtotal: `Rp 120.000`
   - Diskon: `Rp 10.000`
   - Total bayar: `Rp 110.000`
   - Kembalian: `Rp 40.000`
7. Klik **Konfirmasi pembayaran** satu kali.
8. Struk menampilkan nomor transaksi, total, uang diterima, dan kembalian.

Yang dijelaskan:

- Stok berkurang otomatis setelah transaksi tercatat.
- Tombol konfirmasi dinonaktifkan saat proses berjalan. Backend juga memakai
  `idempotency_key`, sehingga request ulang dengan kunci yang sama tidak
  membuat transaksi kedua.
- Pembayaran **transfer hanya dicatat metodenya**, bukan diverifikasi oleh bank
  atau penyedia pembayaran.

### Langkah 4 — Bukti transaksi

1. Buka **Transaksi**.
2. Pilih transaksi terbaru.
3. Tunjukkan nomor transaksi, waktu, item, diskon, total, metode, uang diterima,
   dan kembalian.
4. Transaksi bisa dibuka kembali dari daftar.

### Langkah 5 — Stok berkurang

Buka kembali **Kasir** atau **Produk**, lalu tunjukkan:

- Kopi Susu Gula Aren: **35**
- Roti Bakar Cokelat: **23**

### Langkah 6 — Catat pengeluaran

1. Buka **Pengeluaran**.
2. Tambahkan pengeluaran hari ini:
   - Kategori: `SUPPLIES`
   - Jumlah: `5.000`
   - Deskripsi: `Gas dan kebersihan (demo)`
3. Simpan.

### Langkah 7 — Jelaskan perubahan laporan

Buka **Dashboard**. Angka yang diharapkan:

| Angka | Nilai |
| --- | --- |
| Omzet | `Rp 110.000` |
| Transaksi | `1` |
| HPP | `Rp 66.000` |
| Laba kotor | `Rp 44.000` |
| Pengeluaran | `Rp 25.000` |
| Hasil operasional (estimasi) | `Rp 19.000` |

Jelaskan bahwa:

- Omzet memakai total setelah diskon.
- HPP memakai harga modal produk saat transaksi.
- Hasil operasional belum memasukkan pajak, penyusutan, dan biaya lain.
- Filter **Dari/Sampai** bisa dipakai untuk membatasi laporan; preset periode
  dan ekspor laporan belum ada.

### Langkah 8 — Demonstrasi kegagalan stok

1. Buka **Kasir**.
2. Tambahkan **Keripik Singkong ×7** (stok hanya 6), lalu coba bayar.
3. Aplikasi menampilkan pesan stok tidak mencukupi dan transaksi tidak tercatat.
4. Ulangi dengan **Nasi Goreng Spesial** (stok 0); produk tidak bisa ditambahkan.

Opsional lewat API (membuktikan backend juga menolak):

```bash
TOKEN="<access_token dari login>"
BUSINESS_ID="<business_id dari login>"

curl -s -X POST "http://localhost:8000/api/v1/businesses/$BUSINESS_ID/sales/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": "CASH",
    "amount_received": 100000,
    "discount": 0,
    "items": [{"product_id": 1, "quantity": 9999}]
  }'
```

Respons yang diharapkan: HTTP `400` dengan pesan stok tidak mencukupi, dan stok
tidak berubah.

## 3. Demonstrasi idempotensi checkout (opsional)

Kirim request yang sama dua kali dengan `idempotency_key` yang sama. Kedua
respons harus mengembalikan nomor transaksi yang sama dan stok hanya berkurang
sekali.

```bash
BODY='{
  "payment_method": "CASH",
  "amount_received": 20000,
  "discount": 0,
  "idempotency_key": "demo-double-001",
  "items": [{"product_id": 2, "quantity": 1}]
}'

curl -s -X POST "http://localhost:8000/api/v1/businesses/$BUSINESS_ID/sales/checkout" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY"

curl -s -X POST "http://localhost:8000/api/v1/businesses/$BUSINESS_ID/sales/checkout" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY"
```

## 4. Reset demo

```bash
./venv/bin/python backend/scripts/seed_demo.py --reset
```

## 5. Hal yang jangan diklaim saat demo

- Jangan sebut pembayaran QRIS/transfer sudah terintegrasi atau terverifikasi.
- Jangan sebut laporan punya preset periode, ekspor, atau perbandingan periode.
  Filter rentang tanggal dasar di dashboard boleh disebut.
- Jangan sebut ada shift, rekonsiliasi kas, retur, atau pembatalan.
- Jangan sebut ada akun kasir/manajer dengan hak akses terpisah.
- Jangan sebut ada mode offline, printer struk, barcode scanner, atau multi-cabang.
- Jangan menyebut AI sebagai laporan akuntansi resmi.
