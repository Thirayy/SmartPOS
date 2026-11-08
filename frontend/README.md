# Frontend SmartPOS

Aplikasi Next.js (App Router) untuk SmartPOS. Setup lengkap ada di
[README utama](../README.md).

## Menjalankan

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`.

`NEXT_PUBLIC_API_URL` menentukan alamat backend. Default:
`http://localhost:8000/api/v1`.

## Script

| Perintah | Keterangan |
| --- | --- |
| `npm run dev` | Server pengembangan. |
| `npm run build` | Build produksi. |
| `npm run start` | Jalankan hasil build. |
| `npm run lint` | ESLint. |

## Catatan MVP

- Token dan `business_id` disimpan di `localStorage`. Ini belum memakai cookie
  HttpOnly/CSRF.
- Pembayaran transfer hanya dicatat metodenya; aplikasi tidak memverifikasi dana.
- Dashboard bisa menampilkan seluruh data atau rentang tanggal; preset periode
  dan ekspor belum ada.
- Akun kasir/manajer terpisah dan pembatasan modul belum tersedia.
- Jangan menampilkan data demo seolah-olah data toko nyata.
