/* i18n: teks dari i18n/<kode>.json. Naskah sumber id; cadangan en lalu id. Hanya bahasa yang sudah dirilis yang masuk LANGS. */
(function () {
  const LANGS = [
    { code: 'id', name: 'Bahasa Indonesia', locale: 'id-ID' },
    { code: 'en', name: 'English', locale: 'en-US' }
  ];
  const FALLBACK = ['en', 'id'];
  const dict = {};
  let lang = 'id';

  const store = {
    get() { try { return localStorage.getItem('nv-lang'); } catch (_) { return null; } },
    set(v) { try { localStorage.setItem('nv-lang', v); } catch (_) { /* penyimpanan diblokir: abaikan */ } }
  };
  const supported = c => LANGS.some(l => l.code === c);
  const dev = () => /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  function initial() {
    const saved = store.get();
    if (supported(saved)) return saved;
    const n = ((navigator.languages && navigator.languages[0]) || navigator.language || '').slice(0, 2).toLowerCase();
    return supported(n) ? n : 'en';
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

  const locale = () => LANGS.find(l => l.code === lang).locale;
  const nf = n => Number(n).toLocaleString(locale(), { maximumFractionDigits: 2 });
  const usd = n => new Intl.NumberFormat(locale(), { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2 }).format(n);
  const date = (iso, opts) => new Date(iso).toLocaleDateString(locale(), opts || { day: 'numeric', month: 'long', year: 'numeric' });

  function setLang(code) {
    if (!supported(code) || code === lang) return;
    lang = code;
    store.set(code);
    document.documentElement.lang = code;
    window.dispatchEvent(new Event('nv-lang'));
  }

  async function init() {
    await Promise.all(LANGS.map(l => load(l.code)));
    lang = initial();
    document.documentElement.lang = lang;
  }

  /* pesan validasi RFQ dalam bahasa aktif, untuk NVLib.validateRfq(p, msg) */
  const rfqMessages = () => Object.fromEntries(['company_name', 'contact_name', 'email', 'phone', 'country', 'qty_min', 'qty_dec', 'qty_max', 'notes'].map(k => [k, t('v.' + k)]));

  window.NVI18N = { LANGS, init, t, nf, usd, date, locale, setLang, rfqMessages, get lang() { return lang; } };
})();
