/* Logika bersama (browser + Node untuk test). Rumus harga hanya ada di sini. */
(function (root) {
  const LOW_STOCK_KG = 25;
  const STATUS_FLOW = { PENDING: ['QUOTED', 'CANCELLED'], QUOTED: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['CANCELLED'], CANCELLED: [] };
  const STATUS_LABEL = { PENDING: 'Menunggu', QUOTED: 'Penawaran dikirim', CONFIRMED: 'Dikonfirmasi', CANCELLED: 'Dibatalkan' };

  const round2 = n => Number(Math.round(Number(n) + 'e2') + 'e-2'); // hindari galat float (288.875 → 288.88)
  const decimals = n => { const s = String(n); const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; };

  /** total_estimasi = quantity * price_per_kg (dibulatkan 2 desimal) */
  const estimate = (quantityKg, pricePerKg) => round2(Number(quantityKg) * Number(pricePerKg));

  const formatUSD = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const PHONE_RE = /^[+0-9 ()-]{6,30}$/;
  const CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;

  /** Kembalikan { nama_field: pesan } — kosong berarti valid. Database menegakkan aturan yang sama. */
  function validateRfq(p) {
    const e = {};
    const t = v => String(v ?? '').trim();
    if (t(p.company_name).length < 2) e.company_name = 'Isi nama perusahaan.';
    if (t(p.contact_name).length < 2) e.contact_name = 'Isi nama kontak.';
    if (!EMAIL_RE.test(t(p.email)) || t(p.email).length > 254) e.email = 'Masukkan email yang valid.';
    if (!PHONE_RE.test(t(p.phone))) e.phone = 'Masukkan nomor kontak yang valid.';
    if (t(p.country).length < 2) e.country = 'Isi negara tujuan.';
    const q = Number(p.quantity_kg);
    if (p.quantity_kg === '' || p.quantity_kg == null || !Number.isFinite(q) || q < 1) e.quantity_kg = 'Kuantitas pemesanan minimal 1 kg.';
    else if (decimals(p.quantity_kg) > 2) e.quantity_kg = 'Maksimal 2 angka desimal.';
    else if (q > 100000) e.quantity_kg = 'Kuantitas terlalu besar. Hubungi kami.';
    const n = t(p.notes);
    if (n.length > 1000 || CONTROL_RE.test(n)) e.notes = 'Catatan maksimal 1000 karakter tanpa karakter kontrol.';
    return e;
  }

  /** Validasi form admin: harga > 0, stok >= 0, kadar 0..100. */
  function validateProduct(p) {
    const e = {};
    const num = v => (v === '' || v == null ? NaN : Number(v));
    if (!String(p.name ?? '').trim()) e.name = 'Isi nama produk.';
    if (!String(p.grade ?? '').trim()) e.grade = 'Isi grade.';
    if (!(num(p.price_per_kg) > 0)) e.price_per_kg = 'Harga jual harus lebih dari 0';
    if (!(num(p.stock_kg) >= 0)) e.stock_kg = 'Stok tidak boleh negatif';
    const m = num(p.moisture_percentage); if (!(m >= 0 && m <= 100)) e.moisture_percentage = 'Kadar air 0 sampai 100.';
    const v = num(p.vanillin_percentage); if (!(v >= 0 && v <= 100)) e.vanillin_percentage = 'Vanilin 0 sampai 100.';
    const l = num(p.length_cm); if (!(l >= 0)) e.length_cm = 'Panjang tidak boleh negatif.';
    return e;
  }

  const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const isLowStock = p => p.status !== 'OUT_OF_STOCK' && Number(p.stock_kg) < LOW_STOCK_KG;

  const api = { LOW_STOCK_KG, STATUS_FLOW, STATUS_LABEL, round2, estimate, formatUSD, validateRfq, validateProduct, slugify, isLowStock };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NVLib = api;
})(typeof window !== 'undefined' ? window : globalThis);
