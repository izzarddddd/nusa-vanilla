/* Helper bersama untuk storefront dan admin. */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmtDate = iso => new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';

  let toastT;
  function toast(msg, bad = false) {
    const admin = document.body.classList.contains('is-admin');
    let t = $('.toast, .a-toast');
    if (!t) { t = document.createElement('div'); t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.className = (admin ? 'a-toast' : 'toast') + (bad ? ' bad' : '');
    t.textContent = msg;
    clearTimeout(toastT);
    toastT = setTimeout(() => t.remove(), bad ? 5000 : 2800);
  }

  function seo(title, desc) {
    document.title = title;
    const set = (sel, attr, val) => { const m = $(sel); if (m) m.setAttribute(attr, val); };
    set('meta[name="description"]', 'content', desc);
    set('meta[property="og:title"]', 'content', title);
    set('meta[property="og:description"]', 'content', desc);
    set('link[rel="canonical"]', 'href', (window.SITE_URL || location.origin + location.pathname.replace(/index\.html$/, '')));
    const rb = $('meta[name="robots"]');
    if (rb) rb.setAttribute('content', document.body.classList.contains('is-admin') ? 'noindex, nofollow' : 'index, follow');
  }

  /* modal aksesibel: fokus masuk, Esc menutup, fokus kembali */
  function openOverlay(node, { onClose } = {}) {
    const prev = document.activeElement;
    document.body.appendChild(node);
    document.body.style.overflow = 'hidden';
    const focusables = () => [...node.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter(e => e.offsetParent !== null);
    const close = () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = '';
      node.classList.add('out');
      setTimeout(() => { node.remove(); prev && prev.focus && prev.focus(); onClose && onClose(); }, 150);
    };
    const key = e => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { const f = focusables(); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    };
    document.addEventListener('keydown', key);
    node.addEventListener('mousedown', e => { if (e.target === node) close(); });
    setTimeout(() => { const f = focusables()[0]; f && f.focus(); }, 30);
    return close;
  }

  window.NV = { esc, $, $$, fmtDate, toast, seo, openOverlay };
})();
