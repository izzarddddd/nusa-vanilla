/* i18n: teks dari i18n/<kode>.json. Naskah sumber id; cadangan en lalu id.
   Pemilih bahasa hanya menampilkan bahasa dengan released: true. Bahasa draf tetap bisa dibuka untuk ditinjau lewat ?lang=<kode>. */
(function () {
  const LANGS = [
    { code: 'id', name: 'Bahasa Indonesia', locale: 'id-ID', released: true },
    { code: 'en', name: 'English', locale: 'en-US', released: true },
    { code: 'fr', name: 'Français', locale: 'fr-FR', released: true },
    { code: 'es', name: 'Español', locale: 'es-ES', released: true },
    // ja dan ko: draf terjemahan AI, ubah released ke true setelah ditinjau penutur asli (PRD Bagian 2)
    { code: 'ja', name: '日本語', locale: 'ja-JP', released: false, font: 'Noto+Sans+JP' },
    { code: 'ko', name: '한국어', locale: 'ko-KR', released: false, font: 'Noto+Sans+KR' }
  ];
  const FALLBACK = ['en', 'id'];
  const dict = {};
  let lang = 'id';

  const store = {
    get() { try { return localStorage.getItem('nv-lang'); } catch (_) { return null; } },
    set(v) { try { localStorage.setItem('nv-lang', v); } catch (_) { /* penyimpanan diblokir: abaikan */ } }
  };
  const find = c => LANGS.find(l => l.code === c);
  const released = c => !!(find(c) && find(c).released);
  const dev = () => /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  function initial() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('lang'); } catch (_) { /* abaikan */ }
    if (find(q)) return q; // peninjauan bahasa draf, tidak disimpan
    const saved = store.get();
    if (released(saved)) return saved;
    const n = ((navigator.languages && navigator.languages[0]) || navigator.language || '').slice(0, 2).toLowerCase();
    return released(n) ? n : 'en';
  }

  /* Font aksara CJK dimuat hanya saat bahasanya dipakai; Google Fonts memecah per subset (unicode-range) dan display=swap */
  function ensureFont(code) {
    const l = find(code);
    if (!l || !l.font || document.getElementById('font-' + code)) return;
    const link = document.createElement('link');
    link.id = 'font-' + code; link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${l.font}:wght@400;500;600&display=swap`;
    document.head.appendChild(link);
  }

  async function load(code) {
    try {
      const r = await fetch(`i18n/${code}.json`);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      dict[code] = await r.json();
    } catch (e) {
      dict[code] = {};
      if (dev()) console.warn('Terjemahan ' + code + ' gagal dimuat:', e);
    }
  }

  function t(key, vars) {
    let s = dict[lang] && dict[lang][key];
    if (s == null) {
      for (const f of FALLBACK) { if (dict[f] && dict[f][key] != null) { s = dict[f][key]; break; } }
      if (s != null && dev()) console.warn('Kunci terjemahan hilang untuk ' + lang + ':', key);
    }
    if (s == null) { if (dev()) console.warn('Kunci terjemahan tidak ada:', key); return ''; }
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : s;
  }

  const locale = () => find(lang).locale;
  const nf = n => Number(n).toLocaleString(locale(), { maximumFractionDigits: 2 });
  const usd = n => new Intl.NumberFormat(locale(), { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2 }).format(n);
  const date = (iso, opts) => new Date(iso).toLocaleDateString(locale(), opts || { day: 'numeric', month: 'long', year: 'numeric' });

  /* bahasa untuk pemilih: yang sudah dirilis, ditambah bahasa draf yang sedang dibuka */
  const pickerLangs = () => LANGS.filter(l => l.released || l.code === lang);

  function setLang(code) {
    if (!find(code) || code === lang) return;
    lang = code;
    if (released(code)) store.set(code);
    document.documentElement.lang = code;
    ensureFont(code);
    window.dispatchEvent(new Event('nv-lang'));
  }

  async function init() {
    // hanya berkas yang bisa dipakai: bahasa rilis (pemilih) dan cadangan; draf dimuat bila sedang dibuka
    lang = initial();
    await Promise.all([...new Set([...LANGS.filter(l => l.released).map(l => l.code), ...FALLBACK, lang])].map(load));
    document.documentElement.lang = lang;
    ensureFont(lang);
  }

  /* pesan validasi RFQ dalam bahasa aktif, untuk NVLib.validateRfq(p, msg) */
  const rfqMessages = () => Object.fromEntries(['company_name', 'contact_name', 'email', 'phone', 'country', 'qty_min', 'qty_dec', 'qty_max', 'notes'].map(k => [k, t('v.' + k)]));

  window.NVI18N = { LANGS, pickerLangs, init, t, nf, usd, date, locale, setLang, rfqMessages, get lang() { return lang; } };
})();
