# Changelog

## 2026-11-21
- Nama merek diganti dari "Nusa Vanilla" menjadi "Tropic Bean Co." (judul, og:*, header, footer, terjemahan, README). URL situs, nama repo `nusa-vanilla`, dan nama paket sengaja tidak diubah.
- Multibahasa tahap 2-3: terjemahan fr, es (dirilis di pemilih) serta ja, ko (draf AI, belum dirilis: buka lewat `?lang=ja` / `?lang=ko`, ubah `released: true` di `js/i18n.js` setelah ditinjau penutur asli). Font Noto Sans JP/KR dimuat hanya saat dipakai (display=swap), judul serif diganti sans, `word-break: keep-all` (ko), `line-break: strict` + `auto-phrase` (ja). Animasi judul memecah teks Jepang lewat `Intl.Segmenter` (sebelumnya satu kalimat jadi satu blok lebar). Header ponsel dirapikan agar pemilih bahasa dan tombol RFQ muat di 390px. Tes i18n kini mencakup keenam bahasa.
- `schema.sql`: terjemahan fr/es/ja/ko untuk deskripsi produk awal (belum dijalankan di Supabase).

- Multibahasa tahap 1 (id + en), PRD Bagian 2: `js/i18n.js` + `i18n/id.json`/`en.json`, pemilih bahasa di header (disimpan di localStorage, awal dari bahasa browser, cadangan en), angka/tanggal/USD mengikuti bahasa, pesan galat server diterjemahkan lewat kode. `NVLib.validateRfq(p, msg)` menerima pesan opsional (kompatibel dengan repo admin). Tagline hero tidak lagi terpotong (batas typewriter 90 huruf).
- `schema.sql`: tabel `product_translations` (6 kode bahasa) + terjemahan Inggris produk awal. Situs tetap jalan bila tabel belum ada (teks sumber id). Tes baru `tests/i18n.test.js`.

- PRD lanjutan (B1-B3, 1C): peta dan daftar negara tujuan contoh dihapus (bagian jadi "Dokumen mutu dan sertifikasi"), statistik "negara tujuan" dihapus; catatan privasi di formulir RFQ; halaman produk menampilkan tanggal "Diperbarui" dan label "harga referensi indikatif"; `og:image` ditambahkan. Skema Admin v2 sudah dijalankan di Supabase (21 Nov 2026).
- PRD penyesuaian (A1-A3): pesan galat katalog/produk diganti teks ramah (detail ke konsol); lencana sertifikasi contoh dihapus, diganti "Dokumen mutu dan hasil uji tersedia atas permintaan untuk setiap lot" (isi `CERTS` di `js/decor.js` bila sertifikat sudah ada); alur dan hero diubah menjadi "petani mitra"; janji "dua menit" dan klaim vanilin "di tiap produk" dihapus; `robots` jadi `noindex, nofollow` sampai isi final.
- `.mcp.json` ditambahkan untuk Supabase MCP (project_ref `kwbktpbqfdqpopxltjqs`).

## 2026-11-20
- Portal admin dipisah ke repo `nusa-vanilla-admin`; kode admin (`js/admin.js`, `css/admin.css`, rute `#/admin/*`) dan fungsi admin di `js/data.js` dihapus dari situs publik.
- `schema.sql`: tambah bagian "Admin v2" (tabel `buyers`, riwayat harga, catatan internal dan penawaran final di `inquiries`, bucket foto `product-images`). Jalankan ulang di Supabase SQL Editor; aman diulang.
