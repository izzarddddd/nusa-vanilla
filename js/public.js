/* Storefront publik: landing, detail produk, modal RFQ, cek status RFQ. */
(function () {
  const { esc, $, $$, fmtDate, toast, seo, openOverlay } = window.NV;
  const L = window.NVLib, D = window.NVData, X = window.NVD, M = window.NVM;
  const HERO_URL = (window.HERO_VIDEO_URL || '') || 'videos/hero-vanili.mp4';
  const HERO_POSTER = 'videos/hero-vanili-poster.jpg';
  const nf = n => Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
  let cache = null;
  const products = async (force) => (cache && !force ? cache : (cache = await D.products()));

  const header = () => `<a class="skip" href="#main">Lewati ke konten</a>
    <header class="hdr glass"><a class="brand" href="#/">Nusa Vanilla</a>
      <nav class="nav" aria-label="Utama"><a href="#/" data-scroll="katalog">Katalog</a><a href="#/" data-scroll="cerita">Dari kebun</a><a href="#/rfq/status">Cek status RFQ</a>
      <button class="btn sm" data-rfq type="button">Request Quotation (RFQ)</button></nav></header>`;
  const footer = () => `<footer class="foot"><div class="container"><div><b>Nusa Vanilla</b><p>Vanili Indonesia untuk industri pangan, perisa, dan kosmetik.</p></div>
    <div><a href="#/" data-scroll="katalog">Katalog</a><br><a href="#/rfq/status">Cek status RFQ</a></div><div>© <span>${new Date().getFullYear()}</span> Nusa Vanilla</div></div></footer>`;

  const stockNote = p => p.status === 'OUT_OF_STOCK' ? `<span class="chip warn">Stok Menipis / Hubungi Kami</span>` : L.isLowStock(p) ? `<span class="meta"><span class="lowdot" aria-hidden="true"></span>Stok menipis, sisa ${nf(p.stock_kg)} kg</span>` : `<span class="meta">Stok ${nf(p.stock_kg)} kg</span>`;

  function card(p) {
    return `<article class="card glass">
      <a class="card-photo" href="#/produk/${esc(p.slug)}" tabindex="-1" aria-hidden="true"><div class="tilt-art">${X.image(p)}</div></a>
      <div class="card-body"><span class="chip">${esc(p.grade)}</span>
        <h3><a href="#/produk/${esc(p.slug)}">${esc(p.name)}</a></h3>
        <p class="meta">${esc(p.origin || 'Indonesia')}${p.length_cm ? ' · ' + nf(p.length_cm) + ' cm' : ''} · air ${nf(p.moisture_percentage)}% · vanilin ${nf(p.vanillin_percentage)}%</p>
        <div class="card-foot"><div class="price">${L.formatUSD(p.price_per_kg)}<small> /kg</small></div>${stockNote(p)}</div></div></article>`;
  }

  /* ───────── landing ───────── */
  const STAGES = [
    ['Penyerbukan dan panen', 'Bunga vanili hanya mekar sehari, jadi penyerbukan dilakukan manual satu per satu. Polong dipanen saat matang di pohon.'],
    ['Curing dan pengeringan', 'Polong hijau dilayukan, diperam, lalu dijemur bertahap selama beberapa minggu sampai cokelat tua, lentur, dan harum.'],
    ['Grading dan uji mutu', 'Polong dipilah menurut panjang, kelembapan, dan aroma. Kadar air dan vanilin diperiksa, hasilnya tercatat di setiap produk.'],
    ['Pengemasan dan ekspor', 'Polong dikemas rapat, lalu dokumen ekspor disiapkan: invoice, packing list, dan dokumen karantina sesuai negara tujuan.']
  ];
  function landingHTML() {
    return `${header()}<main id="main">
    <section class="hero" aria-labelledby="h1"><div class="hero-media" aria-hidden="true">
        <img class="poster" src="${HERO_POSTER}" alt="" width="1280" height="720" fetchpriority="high" decoding="async"><div class="hero-shade"></div></div>
      <div class="container hero-inner"><div class="hero-panel glass glass-dark">
        <h1 id="h1">Vanili Indonesia dengan mutu yang bisa Anda periksa</h1>
        <p class="lede">Planifolia dan Tahitensis, lengkap dengan kadar air, panjang polong, dan vanilin di tiap produk. Minta penawaran dalam dua menit.</p>
        <p class="tagline" data-typewriter>Planifolia &amp; Tahitensis, dari kebun ke pelabuhan ekspor.</p>
        <div class="hero-cta"><button class="btn" data-rfq type="button">Request Quotation (RFQ)</button><a class="btn ghost" href="#/" data-scroll="katalog">Lihat katalog</a></div></div></div>
      <span class="scroll-hint" aria-hidden="true">Gulir</span></section>
    <div class="strip container" id="strip" style="min-height:112px"></div>
    <div class="section blobs paper" id="katalog" aria-labelledby="kat-h"><div class="container">
      <div class="section-head"><h2 class="tr" id="kat-h">Katalog vanili ekspor</h2><p>Harga referensi dalam USD per kilogram. Harga final dikonfirmasi lewat penawaran resmi.</p></div>
      <form class="search" role="search" onsubmit="return false"><label class="sr-only" for="q">Cari produk</label><input id="q" type="search" placeholder="Cari nama atau grade" autocomplete="off"></form>
      <div class="grid" id="grid" aria-live="polite">${'<div class="skeleton" aria-hidden="true"></div>'.repeat(3)}</div></div></div>
    ${X.vine()}
    <section class="blobs paper" id="cerita" aria-labelledby="cer-h"><div class="container" style="padding-top:var(--s8)"><div class="section-head" style="margin-bottom:var(--s5)"><h2 class="tr" id="cer-h">Dari kebun ke kontainer</h2><p>Empat tahap yang menentukan mutu polong sebelum sampai di pelabuhan Anda.</p></div></div>
      <div class="story"><div class="story-pin"><div class="container story-grid">
        <div class="story-art" aria-hidden="true">${X.STORY_ART.map((s, i) => s.replace('<svg', `<svg class="${i === 0 ? 'on' : ''}"`)).join('')}</div>
        <div class="story-side"><div class="story-line" aria-hidden="true"><i></i></div><div class="story-panels">${STAGES.map(([t, d], i) => `<div class="stage glass ${i === 0 ? 'on' : ''}"><div class="mini" aria-hidden="true">${X.STORY_ART[i]}</div><span class="num">Tahap ${i + 1} dari 4</span><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></div>
      </div></div></div></section>
    ${X.vine()}
    <section class="section blobs" aria-labelledby="eks-h"><div class="container"><div class="section-head"><h2 class="tr" id="eks-h">Rute ekspor dan sertifikasi</h2><p>Dari Jawa ke pelabuhan tujuan pembeli. Dokumen ekspor dan sertifikasi mengikuti persyaratan negara tujuan.</p></div>
      <div class="export-grid">${X.exportMap()}<div data-reveal><h3 style="margin-bottom:var(--s4);font-size:1.4rem">Sertifikasi dan COA</h3>${X.certBadges()}<p class="note">Lencana berlabel "contoh" belum dikonfirmasi pemilik dan akan diganti dengan sertifikasi yang dimiliki.</p></div></div></div></section>
    <section class="cta" aria-labelledby="cta-h"><div class="container"><h2 class="tr" id="cta-h">Butuh penawaran untuk volume Anda?</h2><p>Sebutkan jenis vanili, volume, dan negara tujuan. Kami kirim penawaran resmi lewat email.</p><button class="btn" data-rfq type="button">Request Quotation (RFQ)</button></div></section></main>${footer()}`;
  }

  async function landing(app) {
    seo('Nusa Vanilla | Vanili Planifolia & Tahitensis untuk ekspor', 'Katalog vanili Indonesia untuk pembeli B2B: spesifikasi mutu, harga referensi per kg, dan permintaan penawaran (RFQ) langsung.');
    app.innerHTML = landingHTML();
    M.scan(app, { heroUrl: HERO_URL });
    const grid = $('#grid', app);
    try {
      const list = await products(true);
      const maxLen = Math.max(0, ...list.map(p => p.length_cm)), maxVan = Math.max(0, ...list.map(p => p.vanillin_percentage));
      $('#strip', app).innerHTML = `<div class="strip-grid glass" role="list">${[
        [maxLen, 0, '', 'cm panjang polong maksimum'], [maxVan, 1, '%', 'kadar vanilin tertinggi'], [list.length, 0, '', 'varian di katalog'], [X.DESTINATIONS.length, 0, '', 'negara tujuan (contoh)']
      ].map(([v, d, s, t]) => `<div class="stat" role="listitem"><b data-count="${v}" data-decimals="${d}" data-suffix="${s}" aria-label="${v.toFixed(d)}${s} ${t}">${v.toFixed(d)}${s}</b><span>${t}</span></div>`).join('')}</div>`;
      M.scan($('#strip', app), { keep: true });
      const render = (animate) => {
        const q = $('#q', app).value.trim().toLowerCase();
        const l = q ? list.filter(p => (p.name + ' ' + p.grade).toLowerCase().includes(q)) : list;
        grid.innerHTML = l.length ? l.map(card).join('') : `<div class="empty glass"><p>Tidak ada produk untuk "${esc(q)}".</p><button class="btn sm" type="button" data-clear>Tampilkan semua produk</button></div>`;
        if (animate) grid.setAttribute('data-stagger', ''); else grid.removeAttribute('data-stagger');
        M.scan(grid, { keep: true });
      };
      render(true);
      $('#q', app).addEventListener('input', () => render(false));
      grid.addEventListener('click', e => { if (e.target.closest('[data-clear]')) { $('#q', app).value = ''; render(false); } });
    } catch (err) {
      grid.innerHTML = `<div class="empty glass"><p>Katalog belum bisa dimuat. ${esc(err.message)}</p><button class="btn sm" type="button" data-retry>Coba lagi</button></div>`;
      grid.addEventListener('click', e => { if (e.target.closest('[data-retry]')) landing(app); });
    }
  }

  /* ───────── detail produk ───────── */
  async function productPage(app, slug) {
    app.innerHTML = `${header()}<main id="main" class="pd blobs"><div class="container"><div class="skeleton" style="min-height:480px"></div></div></main>`;
    let p;
    try { p = await D.product(slug); } catch (e) { p = undefined; app.querySelector('.container').innerHTML = `<div class="empty glass"><p>Produk belum bisa dimuat. ${esc(e.message)}</p><a class="btn sm" href="#/produk/${esc(slug)}">Coba lagi</a></div>`; M.scan(app); return; }
    if (!p) return notFound(app, 'Produk tidak ditemukan atau sudah tidak tersedia.');
    seo(`${p.name} | Nusa Vanilla`, `${p.name}, ${p.grade}. Kadar air ${nf(p.moisture_percentage)}%, vanilin ${nf(p.vanillin_percentage)}%. Harga referensi ${L.formatUSD(p.price_per_kg)}/kg.`);
    const rows = [p.length_cm ? ['Panjang polong', p.length_cm, 25, 1, ' cm'] : null, ['Kadar air', p.moisture_percentage, 40, 1, '%'], ['Kadar vanilin', p.vanillin_percentage, 3, 1, '%']].filter(Boolean);
    app.innerHTML = `${header()}<main id="main" class="pd blobs"><div class="container">
      <p class="crumb"><a href="#/" data-scroll="katalog">← Katalog</a></p>
      <div class="pd-grid"><div>
        <div class="macro" id="macro"><div class="art" id="macro-art">${X.image(p, 1)}</div>
          ${p.length_cm ? `<button class="hot" style="left:30%;top:68%" data-tip="Panjang ${nf(p.length_cm)} cm" aria-label="Panjang ${nf(p.length_cm)} cm" type="button"></button>` : ''}
          <button class="hot" style="left:54%;top:44%" data-tip="Kadar air ${nf(p.moisture_percentage)}%" aria-label="Kadar air ${nf(p.moisture_percentage)}%" type="button"></button>
          <button class="hot" style="left:76%;top:22%" data-tip="Vanilin ${nf(p.vanillin_percentage)}%" aria-label="Vanilin ${nf(p.vanillin_percentage)}%" type="button"></button></div>
        <ul class="hot-list">${p.length_cm ? `<li>Panjang ${nf(p.length_cm)} cm</li>` : ''}<li>Kadar air ${nf(p.moisture_percentage)}%</li><li>Vanilin ${nf(p.vanillin_percentage)}%</li></ul>
        <div class="gallery" role="group" aria-label="Pilih tampilan">${[0, 1, 2].map(v => `<button type="button" data-view="${v}" aria-pressed="${v === 1}" aria-label="Tampilan ${v + 1}">${X.image(p, v)}</button>`).join('')}</div>
        <p class="note">Ilustrasi pengganti foto produk. Foto asli akan ditambahkan pemilik.</p></div>
      <div class="pd-info" data-reveal><span class="chip">${esc(p.grade)}</span><h1>${esc(p.name)}</h1>
        <p class="meta">${esc(p.origin || 'Indonesia')}</p><p style="margin-top:var(--s3);max-width:56ch">${esc(p.description || '')}</p>
        <div class="specs glass">${rows.map(([t, v, max, d, s]) => `<div class="spec-row"><span>${t}</span><div class="spec-bar" style="--r:${Math.min(1, v / max).toFixed(3)}" role="img" aria-label="${t} ${nf(v)}${s}"><i></i></div><b data-count="${v}" data-decimals="${v % 1 ? d : 0}" data-suffix="${s}" aria-label="${nf(v)}${s}">${nf(v)}${s}</b></div>`).join('')}</div>
        <p class="price" style="margin-bottom:var(--s3)">${L.formatUSD(p.price_per_kg)}<small> /kg, harga referensi</small></p>
        <div style="margin-bottom:var(--s4)">${stockNote(p)}</div>
        ${X.calculator(p, Math.max(1, Math.min(500, 10)))}
        <div class="hero-cta" style="margin-top:var(--s5)"><button class="btn" id="rfq-this" type="button">Request Quotation (RFQ)</button>${p.status === 'OUT_OF_STOCK' ? '<span class="chip warn">Stok Menipis / Hubungi Kami</span>' : ''}</div>
      </div></div></div></main>${footer()}`;
    M.scan(app);
    let qty = 10;
    X.bindCalc(app, (q, ok) => { if (ok) qty = q; });
    $('#rfq-this', app).addEventListener('click', () => openRfq({ product: p, qty }));
    $('.gallery', app).addEventListener('click', e => {
      const b = e.target.closest('[data-view]'); if (!b) return;
      $$('.gallery button', app).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $('#macro-art', app).innerHTML = X.image(p, +b.dataset.view);
    });
  }

  /* ───────── modal RFQ ───────── */
  const field = (id, label, extra = '', tag = 'input') => `<div><label class="l" for="f-${id}">${label}</label>${tag === 'textarea' ? `<textarea class="field" id="f-${id}" name="${id}" rows="3" maxlength="1000" aria-describedby="e-${id}"></textarea>` : `<input class="field" id="f-${id}" name="${id}" ${extra} aria-describedby="e-${id}">`}<div class="err" id="e-${id}" aria-live="polite"></div></div>`;
  async function openRfq({ product, qty = 10 } = {}) {
    let list = [];
    try { list = await products(); } catch (_) { toast('Katalog belum bisa dimuat. Coba lagi.', true); return; }
    if (product && !list.some(x => x.id === product.id)) list = [product, ...list];
    let cur = product || list[0]; if (!cur) { toast('Belum ada produk yang tersedia.', true); return; }
    const key = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2));
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = `<div class="modal glass" role="dialog" aria-modal="true" aria-labelledby="rfq-h" style="position:relative"><button class="btn sm ghost x" type="button" aria-label="Tutup" data-x>✕</button><div data-body></div></div>`;
    const close = openOverlay(ov);
    const body = $('[data-body]', ov);
    let q = qty, calc;
    const mountCalc = () => { $('#calcbox', ov).innerHTML = X.calculator(cur, q, true); calc = X.bindCalc(ov, (v, ok) => { q = v; }); };
    body.innerHTML = `<h2 id="rfq-h">Request Quotation (RFQ)</h2><p class="meta">Isi data singkat. Nomor referensi tampil langsung setelah terkirim.</p>
      <form class="form" novalidate><div class="err" id="e-form" role="alert"></div>
      <div><label class="l" for="f-product">Produk</label><select class="field" id="f-product" name="product_id">${list.map(x => `<option value="${x.id}" ${x.id === cur.id ? 'selected' : ''}>${esc(x.name)} (${esc(x.grade)})</option>`).join('')}</select></div>
      <div id="calcbox"></div>
      <div class="two">${field('company_name', 'Nama perusahaan', 'autocomplete="organization"')}${field('contact_name', 'Nama kontak', 'autocomplete="name"')}</div>
      <div class="two">${field('email', 'Email', 'type="email" autocomplete="email"')}${field('phone', 'Nomor kontak', 'type="tel" autocomplete="tel" placeholder="+49 40 123456"')}</div>
      ${field('country', 'Negara tujuan', 'autocomplete="country-name"')}
      ${field('notes', 'Catatan (opsional)', '', 'textarea')}
      <div class="hp" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></div>
      <button class="btn" type="submit" id="send">Kirim permintaan</button></form>`;
    mountCalc();
    $('#f-product', ov).addEventListener('change', e => { cur = list.find(x => x.id === e.target.value); mountCalc(); });
    ov.addEventListener('click', e => { if (e.target.closest('[data-x]')) close(); });
    const form = $('form', ov), btn = $('#send', ov);
    const showErr = errs => { $$('.err', form).forEach(n => n.textContent = ''); $$('[aria-invalid]', form).forEach(n => n.removeAttribute('aria-invalid')); let first; for (const [k, v] of Object.entries(errs)) { const n = $('#e-' + (k === 'quantity_kg' ? 'form' : k), form); const f = $('#f-' + k, form) || $('[data-calc-num]', form); if (k === 'quantity_kg') { $('[data-calc-err]', form).textContent = v; $('[data-calc-num]', form).setAttribute('aria-invalid', 'true'); } else if (n) n.textContent = v; if (f) { f.setAttribute('aria-invalid', 'true'); first = first || f; } } first && first.focus(); };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (btn.disabled) return;
      const fd = Object.fromEntries(new FormData(form));
      const payload = { product_id: cur.id, company_name: fd.company_name, contact_name: fd.contact_name, email: fd.email, phone: fd.phone, country: fd.country, quantity_kg: $('[data-calc-num]', form).value === '' ? '' : Number($('[data-calc-num]', form).value), notes: fd.notes, website: fd.website };
      const errs = L.validateRfq(payload);
      if (Object.keys(errs).length) return showErr(errs);
      btn.disabled = true; btn.textContent = 'Mengirim…'; $('#e-form', form).textContent = '';
      let res;
      try { res = await D.createInquiry(payload, key); }
      catch (err) { btn.disabled = false; btn.textContent = 'Kirim permintaan'; $('#e-form', form).textContent = 'Koneksi bermasalah, permintaan belum terkirim. Periksa koneksi lalu kirim lagi.'; return; }
      if (res && res.ok) return success(res.data);
      btn.disabled = false; btn.textContent = 'Kirim permintaan';
      if (res && res.code === 'VALIDATION_ERROR') showErr(res.errors || {});
      else { $('#e-form', form).textContent = (res && res.message) || 'Permintaan belum terkirim.'; if (res && res.code === 'PRODUCT_UNAVAILABLE') cache = null; }
    });
    function success(d) {
      body.innerHTML = `<div class="success"><svg viewBox="0 0 52 52" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="26" cy="26" r="22" opacity=".25"/><path pathLength="1" d="M15 27l8 8 15-17"/></svg>
        <h2 id="rfq-h">Permintaan terkirim</h2><p class="meta">Nomor referensi RFQ Anda</p><span class="refno">${esc(d.inquiry_number)}</span>
        <p>Estimasi indikatif ${L.formatUSD(d.total_estimate)}. Bukan penawaran resmi; kami kirim penawaran lewat email.</p>
        <div class="hero-cta" style="justify-content:center"><a class="btn" href="#/rfq/status?no=${encodeURIComponent(d.inquiry_number)}" data-x>Cek status</a><button class="btn ghost" type="button" data-x>Tutup</button></div></div>`;
      const f = $('.refno', body); f && f.focus && f.setAttribute('tabindex', '-1');
    }
  }

  /* ───────── cek status RFQ ───────── */
  const STEPS = ['PENDING', 'QUOTED', 'CONFIRMED'];
  function statusPage(app) {
    seo('Cek status RFQ | Nusa Vanilla', 'Masukkan nomor RFQ dan email untuk melihat status permintaan penawaran Anda.');
    const pre = decodeURIComponent((location.hash.split('?no=')[1] || '').split('&')[0]);
    app.innerHTML = `${header()}<main id="main" class="blobs"><div class="status-wrap container"><h1 style="font-size:clamp(2rem,4vw,2.8rem)">Cek status RFQ</h1>
      <p class="meta" style="margin:var(--s3) 0 var(--s5)">Gunakan nomor RFQ dan email yang sama dengan saat mengirim permintaan.</p>
      <form class="glass form" style="padding:var(--s5)" novalidate><div class="err" id="e-form" role="alert"></div>
        <div><label class="l" for="s-no">Nomor RFQ</label><input class="field" id="s-no" value="${esc(pre)}" placeholder="RFQ-2026-AB12CD" autocomplete="off" required></div>
        <div><label class="l" for="s-em">Email</label><input class="field" id="s-em" type="email" autocomplete="email" required></div>
        <button class="btn" type="submit">Cek status</button></form><div id="res" aria-live="polite"></div></div></main>${footer()}`;
    M.scan(app);
    const f = $('form', app), res = $('#res', app);
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const no = $('#s-no', app).value, em = $('#s-em', app).value, er = $('#e-form', app), b = $('button[type=submit]', app);
      er.textContent = ''; res.innerHTML = '';
      if (!no.trim() || L.validateRfq({ company_name: 'xx', contact_name: 'xx', email: em, phone: '123456', country: 'xx', quantity_kg: 1 }).email) { er.textContent = 'Isi nomor RFQ dan email yang valid.'; return; }
      b.disabled = true; b.textContent = 'Memeriksa…';
      try {
        const r = await D.lookup(no, em);
        if (!r.ok) { er.textContent = r.message; }
        else {
          const d = r.data, cancelled = d.status === 'CANCELLED', i = Math.max(0, STEPS.indexOf(d.status));
          res.innerHTML = `<div class="glass" style="padding:var(--s5);margin-top:var(--s5)"><b style="font-size:1.2rem">${esc(d.inquiry_number)}</b><p class="meta">${esc(d.product_name)} · ${nf(d.quantity_kg)} kg</p>
            <div class="tl ${cancelled ? 'cancelled' : ''}" style="--p:${cancelled ? 0 : i / 2}" role="img" aria-label="Status: ${L.STATUS_LABEL[d.status]}"><i></i>${STEPS.map((s, k) => `<div class="tl-step ${!cancelled && k < i ? 'done' : ''} ${!cancelled && k === i ? 'done cur' : ''}">${L.STATUS_LABEL[s]}</div>`).join('')}</div>
            ${cancelled ? '<p class="chip warn">Dibatalkan</p>' : ''}<p class="note">Dikirim ${fmtDate(d.created_at)} · pembaruan terakhir ${fmtDate(d.updated_at)}</p></div>`;
        }
      } catch (err) { er.textContent = 'Koneksi bermasalah. Coba lagi.'; }
      b.disabled = false; b.textContent = 'Cek status';
    });
  }

  function notFound(app, msg) {
    seo('Halaman tidak ditemukan | Nusa Vanilla', 'Halaman yang Anda cari tidak ada.');
    app.innerHTML = `<main id="main" class="nf blobs"><div><h1>404</h1><p style="margin:var(--s3) 0 var(--s5)">${esc(msg || 'Halaman yang Anda cari tidak ada.')}</p><a class="btn" href="#/">Kembali ke katalog</a></div></main>`;
    M.scan(app);
  }

  /* klik delegasi: tombol RFQ dan tautan gulir */
  document.addEventListener('click', e => {
    if (document.body.classList.contains('is-admin')) return;
    const r = e.target.closest('[data-rfq]');
    if (r) { e.preventDefault(); openRfq(); return; }
    const s = e.target.closest('[data-scroll]');
    if (s) {
      e.preventDefault();
      const go = () => { const t = document.getElementById(s.dataset.scroll); t && t.scrollIntoView({ behavior: M.reduced ? 'auto' : 'smooth', block: 'start' }); };
      if (location.hash && location.hash !== '#/' && location.hash !== '#') { location.hash = '#/'; setTimeout(go, 400); } else go();
    }
  });

  window.NVPublic = { landing, productPage, statusPage, notFound, openRfq };
})();
