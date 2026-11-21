# Changelog

## 2026-11-21
- PRD lanjutan (B1-B3, 1C): peta dan daftar negara tujuan contoh dihapus (bagian jadi "Dokumen mutu dan sertifikasi"), statistik "negara tujuan" dihapus; catatan privasi di formulir RFQ; halaman produk menampilkan tanggal "Diperbarui" dan label "harga referensi indikatif"; `og:image` ditambahkan. Skema Admin v2 sudah dijalankan di Supabase (21 Nov 2026).
- PRD penyesuaian (A1-A3): pesan galat katalog/produk diganti teks ramah (detail ke konsol); lencana sertifikasi contoh dihapus, diganti "Dokumen mutu dan hasil uji tersedia atas permintaan untuk setiap lot" (isi `CERTS` di `js/decor.js` bila sertifikat sudah ada); alur dan hero diubah menjadi "petani mitra"; janji "dua menit" dan klaim vanilin "di tiap produk" dihapus; `robots` jadi `noindex, nofollow` sampai isi final.
- `.mcp.json` ditambahkan untuk Supabase MCP (project_ref `kwbktpbqfdqpopxltjqs`).

## 2026-11-20
- Portal admin dipisah ke repo `nusa-vanilla-admin`; kode admin (`js/admin.js`, `css/admin.css`, rute `#/admin/*`) dan fungsi admin di `js/data.js` dihapus dari situs publik.
- `schema.sql`: tambah bagian "Admin v2" (tabel `buyers`, riwayat harga, catatan internal dan penawaran final di `inquiries`, bucket foto `product-images`). Jalankan ulang di Supabase SQL Editor; aman diulang.
