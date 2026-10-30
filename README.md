# Nusa Vanilla

Toko ekspor vanili (single seller) dengan katalog publik, permintaan penawaran (RFQ), cek status RFQ, dan portal admin.

- **Frontend:** HTML/CSS/JavaScript statis, tanpa build step. Dihosting di GitHub Pages.
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security). Aturan bisnis RFQ ada di fungsi database.
- **Rute (hash):** `#/` katalog, `#/produk/:slug`, `#/rfq/status`, `#/admin/login`, `#/admin`, `#/admin/products`, `#/admin/inquiries`.

## Menjalankan lokal
```
npm run serve     # atau buka index.html langsung di browser
npm test          # test rumus harga dan validasi (Node bawaan, tanpa dependency)
```

## Setup Supabase
1. Buat project di supabase.com.
2. SQL Editor → tempel seluruh `schema.sql` → Run. Aman dijalankan ulang.
3. Isi `config.js` dengan Project URL dan **anon key** (Project Settings → API). Jangan pernah memakai `service_role` key di sini.
4. Authentication → Users → Add user (centang Auto Confirm). Lalu jadikan admin:
   ```sql
   insert into admins (user_id) select id from auth.users where email = 'EMAIL_ADMIN';
   ```
5. Authentication → Sign In / Providers → Email: matikan *Enable sign ups*. Satu akun admin dibuat manual; tidak ada pendaftaran atau reset kata sandi di aplikasi.
6. Produk dikelola dari `#/admin/products`. Produk contoh dari seed bisa diubah atau dihapus (soft-delete).

## Deploy (GitHub Pages)
Settings → Pages → Deploy from a branch → `main` / root. Setelah push, situs ada di `https://USERNAME.github.io/nusa-vanilla/`. Samakan `window.SITE_URL` di `config.js`.

## Video hero
`videos/hero-vanili.mp4` (1280×720, 10 dtk, tanpa audio) dan poster `videos/hero-vanili-poster.jpg`. Video baru dimuat setelah halaman idle, diulang dengan crossfade dua elemen, dan diganti poster statis bila *Reduce motion*, Data Saver, koneksi 2g/3g, atau video gagal dimuat. Untuk memakai CDN, isi `window.HERO_VIDEO_URL` di `config.js`.

## Struktur
```
index.html            cangkang halaman
config.js             URL & anon key Supabase, SITE_URL, HERO_VIDEO_URL
schema.sql            tabel, RLS, trigger, fungsi RPC
css/styles.css        token, kaca (glass), storefront
css/admin.css         portal admin (datar, zinc)
js/lib.js             rumus harga & validasi (dipakai browser dan test)
js/core.js            helper, toast, SEO, modal
js/data.js            akses Supabase
js/motion.js          reveal, kata demi kata, mengetik, count-up, cerita scroll, video hero
js/decor.js           ilustrasi, peta rute, lencana, sulur, kalkulator
js/public.js          landing, detail produk, modal RFQ, status RFQ
js/admin.js           login, dashboard, produk, inquiry
js/app.js             router
tests/                test unit
```

## Perbedaan dari PRD (`aaa.md`) dan alasannya
| PRD | Implementasi | Alasan |
|---|---|---|
| Next.js + Drizzle + Vercel | HTML/JS statis + Supabase + GitHub Pages | Hosting yang sudah dipilih tidak menjalankan server. |
| Route Handlers `/api/...` | Fungsi RPC `create_inquiry`, `lookup_inquiry` + RLS | Validasi, nomor RFQ, snapshot harga, dan idempotensi ditegakkan di database. |
| Session cookie HttpOnly + CSRF | Supabase Auth (token JWT di browser) | Tanpa server sendiri, cookie HttpOnly tidak tersedia. |
| Rate limit per IP | Per nomor RFQ (5 gagal/15 menit) dan jeda login yang membesar | IP klien tidak terlihat dari fungsi database. Rate limit per IP butuh Edge Function atau Cloudflare. |
| Pustaka `motion` | Animasi memakai CSS + IntersectionObserver | Tanpa build step; perilaku sama (sekali jalan, transform/opacity). |
| Vitest | `node --test` | Tanpa dependency. |
| `/admin/login` | `#/admin/login` | Routing hash di GitHub Pages. |
| Foto produk, foto cerita | Ilustrasi SVG pengganti | Foto belum disediakan. Isi `image_url` per produk dari admin. |

## Belum dikerjakan / perlu keputusan pemilik
- Sertifikasi (lencana "contoh"), negara tujuan di peta, dan `LOW_STOCK_KG` (25) menunggu konfirmasi. Lihat `js/decor.js` dan `js/lib.js`.
- Gambar Open Graph 1200×630 belum ada (tautan WhatsApp tanpa gambar).
- Lighthouse (LCP/CLS) belum diukur.
- Notifikasi email saat RFQ masuk belum ada. Cek dashboard admin secara berkala atau tambahkan Database Webhook.
- Cadangan database: aktifkan PITR di Supabase (paket berbayar) atau dump berkala, lalu uji pulih sebelum rilis.
- Tabel lama `products`, `orders`, `sellers`, `settings` dari versi sebelumnya masih ada di database dan tidak dipakai lagi. Hapus bila sudah tidak perlu.
