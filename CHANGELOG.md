# Changelog

## 2026-11-20
- Portal admin dipisah ke repo `nusa-vanilla-admin`; kode admin (`js/admin.js`, `css/admin.css`, rute `#/admin/*`) dan fungsi admin di `js/data.js` dihapus dari situs publik.
- `schema.sql`: tambah bagian "Admin v2" (tabel `buyers`, riwayat harga, catatan internal dan penawaran final di `inquiries`, bucket foto `product-images`). Jalankan ulang di Supabase SQL Editor; aman diulang.
