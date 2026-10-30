/* Portal admin: login, dashboard, produk (soft-delete), inquiry. Tanpa animasi dekoratif. */
(function () {
  const { esc, $, $$, fmtDate, toast, seo } = window.NV;
  const L = window.NVLib, D = window.NVData;
  const usd = L.formatUSD;
  const nf = n => Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
  const badge = s => `<span class="a-badge ${{ PENDING: 'warn', QUOTED: '', CONFIRMED: 'ok', CANCELLED: 'bad', AVAILABLE: 'ok', OUT_OF_STOCK: 'warn', ARCHIVED: '' }[s] || ''}">${esc(L.STATUS_LABEL[s] || s)}</span>`;
  const skeleton = `<div class="a-card">${'<div class="a-skel"></div>'.repeat(6)}</div>`;
  const errBox = (m, retry) => `<div class="a-card a-empty">${esc(m)}<div style="margin-top:12px"><button class="a-btn" data-retry>Coba lagi</button></div></div>`;

  /* Konfirmasi sebelum aksi destruktif */
  function confirmBox(msg, label = 'Hapus') {
    return new Promise(res => {
      const bg = document.createElement('div'); bg.className = 'a-modal-bg';
      bg.innerHTML = `<div class="a-modal" role="alertdialog" aria-modal="true" style="width:min(440px,100%)"><h2>Konfirmasi</h2><p style="margin:10px 0 0">${esc(msg)}</p><div class="a-actions"><button class="a-btn bad" data-ok>${esc(label)}</button><button class="a-btn" data-no>Batal</button></div></div>`;
      document.body.appendChild(bg);
      const done = v => { bg.remove(); res(v); };
      bg.addEventListener('click', e => { if (e.target.dataset.ok != null) done(true); if (e.target.dataset.no != null || e.target === bg) done(false); });
      $('[data-no]', bg).focus();
    });
  }

  function shell(tab, inner) {
    const link = (k, t) => `<a href="#/admin${k ? '/' + k : ''}" class="${tab === k ? 'on' : ''}">${t}</a>`;
    return `<div class="a-shell"><aside class="a-side"><div class="a-brand">Nusa Vanilla</div>${link('', 'Dashboard')}${link('inquiries', 'Inquiry RFQ')}${link('products', 'Produk')}<div class="grow"></div><a href="#/" >Lihat situs</a><a href="#" id="out">Keluar</a></aside><main class="a-main" id="a-main">${inner}</main></div>`;
  }

  async function guard(app, next) {
    let ok = false;
    try { ok = await D.isAdmin(); } catch (_) {}
    if (!ok) { location.hash = '#/admin/login?next=' + encodeURIComponent(next); return false; }
    return true;
  }

  /* ───────── login ───────── */
  let fails = 0;
  function login(app) {
    seo('Masuk admin | Nusa Vanilla', 'Portal administrator');
    const next = decodeURIComponent((location.hash.split('?next=')[1] || '#/admin'));
    app.innerHTML = `<div class="a-login"><form class="a-card" novalidate><h1 style="margin:0 0 4px;font-size:1.3rem">Masuk admin</h1><p style="margin:0 0 8px;color:#71717a;font-size:.9rem">Portal pengelola Nusa Vanilla.</p>
      <label class="a-label" for="a-em">Email</label><input class="a-in" id="a-em" type="email" autocomplete="username" required>
      <label class="a-label" for="a-pw">Kata sandi</label><input class="a-in" id="a-pw" type="password" autocomplete="current-password" required>
      <div class="a-err" id="a-e" role="alert"></div><div class="a-actions"><button class="a-btn pri" type="submit">Masuk</button></div></form></div>`;
    $('form', app).addEventListener('submit', async e => {
      e.preventDefault();
      const b = $('button', app), er = $('#a-e', app); er.textContent = '';
      b.disabled = true;
      if (fails) await new Promise(r => setTimeout(r, Math.min(8000, 1000 * 2 ** (fails - 1))));  // jeda membesar, akun tidak dikunci permanen
      const ok = await D.login($('#a-em', app).value.trim(), $('#a-pw', app).value);
      const admin = ok && await D.isAdmin();
      if (!admin) { if (ok) await D.logout(); fails++; er.textContent = 'Email atau kata sandi salah.'; b.disabled = false; return; }
      fails = 0; location.hash = next.startsWith('#/admin') ? next : '#/admin';
    });
    $('#a-em', app).focus();
  }

  /* ───────── dashboard ───────── */
  async function dashboard(app) {
    if (!await guard(app, '#/admin')) return;
    seo('Dashboard | Admin Nusa Vanilla', 'Ringkasan RFQ dan stok');
    app.innerHTML = shell('', `<h1>Dashboard</h1><div id="d">${skeleton}</div>`); bindShell(app);
    try {
      const [c, prods, recent] = await Promise.all([D.counts(), D.adminProducts(), D.inquiries({ limit: 5 })]);
      const active = prods.filter(p => p.status === 'AVAILABLE'), low = prods.filter(L.isLowStock);
      $('#d', app).innerHTML = `<div class="a-kpis">${[['Menunggu', c.PENDING], ['Penawaran dikirim', c.QUOTED], ['Dikonfirmasi', c.CONFIRMED], ['Produk tersedia', active.length], ['Stok menipis', low.length + prods.filter(p => p.status === 'OUT_OF_STOCK').length]].map(([t, v]) => `<div class="a-card"><b>${v}</b><span>${t}</span></div>`).join('')}</div>
        <div class="a-card"><h2 style="margin:0 0 10px;font-size:1rem">RFQ terbaru</h2>${recent.items.length ? `<div class="a-tbl-wrap"><table class="a-tbl"><tr><th>Nomor</th><th>Perusahaan</th><th>Produk</th><th class="num">Kg</th><th>Status</th></tr>${recent.items.map(i => `<tr><td>${esc(i.inquiry_number)}</td><td>${esc(i.company_name)}<br><small>${esc(i.country)}</small></td><td>${esc(i.vanilla_products?.name)}</td><td class="num">${nf(i.quantity_kg)}</td><td>${badge(i.status)}</td></tr>`).join('')}</table></div>` : '<div class="a-empty">Belum ada RFQ. Permintaan dari pembeli akan muncul di sini.</div>'}</div>`;
    } catch (e) { $('#d', app).innerHTML = errBox(e.message); $('[data-retry]', app).onclick = () => dashboard(app); }
  }

  /* ───────── produk ───────── */
  async function productsPage(app) {
    if (!await guard(app, '#/admin/products')) return;
    seo('Produk | Admin Nusa Vanilla', 'Kelola harga dan stok');
    app.innerHTML = shell('products', `<h1>Produk</h1><div class="a-tools"><span class="grow"></span><button class="a-btn pri" id="add">Tambah produk</button></div><div id="list">${skeleton}</div>`); bindShell(app);
    $('#add', app).onclick = () => productForm(null, () => productsPage(app));
    let items;
    try { items = await D.adminProducts(); } catch (e) { $('#list', app).innerHTML = errBox(e.message); $('[data-retry]', app).onclick = () => productsPage(app); return; }
    $('#list', app).innerHTML = items.length ? `<div class="a-card a-tbl-wrap"><table class="a-tbl"><tr><th>Produk</th><th class="num">Harga USD/kg</th><th class="num">Stok kg</th><th>Status</th><th></th></tr>
      ${items.map(p => `<tr data-id="${p.id}"><td><b>${esc(p.name)}</b><br><small>${esc(p.grade)}</small></td>
        <td class="num"><input data-f="price_per_kg" value="${p.price_per_kg}" inputmode="decimal" aria-label="Harga ${esc(p.name)}"><div class="a-err" data-e="price_per_kg"></div></td>
        <td class="num"><input data-f="stock_kg" value="${p.stock_kg}" inputmode="decimal" aria-label="Stok ${esc(p.name)}"><div class="a-err" data-e="stock_kg"></div></td>
        <td><select data-f="status" aria-label="Status ${esc(p.name)}">${['AVAILABLE', 'OUT_OF_STOCK', 'ARCHIVED'].map(s => `<option ${p.status === s ? 'selected' : ''} value="${s}">${s}</option>`).join('')}</select></td>
        <td style="white-space:nowrap"><button class="a-btn pri" data-save disabled>Simpan</button> <button class="a-btn" data-edit>Ubah</button> <button class="a-btn bad" data-del>Hapus</button></td></tr>`).join('')}</table></div>` : '<div class="a-card a-empty">Belum ada produk. Tambahkan produk pertama agar tampil di katalog.</div>';
    const byId = id => items.find(p => p.id === id);
    $('#list', app).addEventListener('input', e => { const tr = e.target.closest('tr[data-id]'); if (tr) $('[data-save]', tr).disabled = false; });
    $('#list', app).addEventListener('change', e => { const tr = e.target.closest('tr[data-id]'); if (tr) $('[data-save]', tr).disabled = false; });
    $('#list', app).addEventListener('click', async e => {
      const tr = e.target.closest('tr[data-id]'); if (!tr) return;
      const p = byId(tr.dataset.id);
      if (e.target.matches('[data-edit]')) return productForm(p, () => productsPage(app));
      if (e.target.matches('[data-save]')) {
        const row = { ...p }; $$('[data-f]', tr).forEach(i => row[i.dataset.f] = i.value);
        const errs = L.validateProduct(row);
        $$('[data-e]', tr).forEach(n => n.textContent = errs[n.dataset.e] || '');
        $$('input[data-f]', tr).forEach(i => i.setAttribute('aria-invalid', errs[i.dataset.f] ? 'true' : 'false'));
        if (errs.price_per_kg || errs.stock_kg) return;
        e.target.disabled = true;
        try { await D.saveProduct({ id: p.id, price_per_kg: +row.price_per_kg, stock_kg: +row.stock_kg, status: row.status }); toast('Tersimpan'); Object.assign(p, { price_per_kg: +row.price_per_kg, stock_kg: +row.stock_kg, status: row.status }); }
        catch (err) { toast(err.message, true); e.target.disabled = false; }
      }
      if (e.target.matches('[data-del]')) {
        let n = 0; try { n = await D.pendingCount(p.id); } catch (_) {}
        const ok = await confirmBox(`Hapus "${p.name}" dari katalog?${n ? ` Produk ini punya ${n} RFQ berstatus Menunggu; riwayat RFQ tetap tersimpan.` : ' Riwayat RFQ tetap tersimpan.'}`);
        if (!ok) return;
        try { await D.softDeleteProduct(p.id); toast('Produk dihapus dari katalog'); productsPage(app); } catch (err) { toast(err.message, true); }
      }
    });
  }

  function productForm(p, done) {
    const v = p || { status: 'AVAILABLE', price_per_kg: '', stock_kg: 0, length_cm: 0, moisture_percentage: '', vanillin_percentage: '' };
    const f = (k, l, t = 'text', extra = '') => `<div><label class="a-label" for="p-${k}">${l}</label><input class="a-in" id="p-${k}" name="${k}" type="${t}" ${extra} value="${esc(v[k] ?? '')}"><div class="a-err" data-e="${k}"></div></div>`;
    const bg = document.createElement('div'); bg.className = 'a-modal-bg';
    bg.innerHTML = `<form class="a-modal" novalidate role="dialog" aria-modal="true" aria-labelledby="pf-h"><h2 id="pf-h">${p ? 'Ubah produk' : 'Tambah produk'}</h2><div class="a-err" id="pf-err" role="alert"></div>
      <div class="a-grid2">${f('name', 'Nama produk')}${f('grade', 'Grade')}${f('origin', 'Asal (mis. Flores, NTT)')}<div><label class="a-label" for="p-status">Status</label><select id="p-status" name="status">${['AVAILABLE', 'OUT_OF_STOCK', 'ARCHIVED'].map(s => `<option ${v.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      ${f('price_per_kg', 'Harga USD per kg', 'text', 'inputmode="decimal"')}${f('stock_kg', 'Stok (kg)', 'text', 'inputmode="decimal"')}${f('length_cm', 'Panjang polong (cm)', 'text', 'inputmode="decimal"')}${f('moisture_percentage', 'Kadar air (%)', 'text', 'inputmode="decimal"')}${f('vanillin_percentage', 'Kadar vanilin (%)', 'text', 'inputmode="decimal"')}${f('image_url', 'URL foto (opsional)')}</div>
      <label class="a-label" for="p-description">Deskripsi</label><textarea id="p-description" name="description" rows="3">${esc(v.description || '')}</textarea>
      <div class="a-actions"><button class="a-btn pri" type="submit">Simpan</button><button class="a-btn" type="button" data-no>Batal</button></div></form>`;
    document.body.appendChild(bg);
    $('input', bg).focus();
    const close = () => bg.remove();
    bg.addEventListener('click', e => { if (e.target === bg || e.target.dataset.no != null) close(); });
    $('form', bg).addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      const errs = L.validateProduct(d);
      $$('[data-e]', bg).forEach(n => n.textContent = errs[n.dataset.e] || '');
      $$('input.a-in', bg).forEach(i => i.setAttribute('aria-invalid', errs[i.name] ? 'true' : 'false'));
      if (Object.keys(errs).length) return;
      const row = { id: p ? p.id : undefined, name: d.name.trim(), grade: d.grade.trim(), origin: d.origin.trim() || null, status: d.status, price_per_kg: +d.price_per_kg, stock_kg: +d.stock_kg, length_cm: +d.length_cm || 0,
        moisture_percentage: +d.moisture_percentage, vanillin_percentage: +d.vanillin_percentage, image_url: d.image_url.trim() || null, description: d.description.trim() || null };
      if (!p) row.slug = L.slugify(row.name);
      const btn = $('button[type=submit]', bg); btn.disabled = true;
      try { await D.saveProduct(row); toast('Tersimpan'); close(); done(); } catch (err) { $('#pf-err', bg).textContent = err.message; btn.disabled = false; }
    });
  }

  /* ───────── inquiry ───────── */
  const state = { status: '', page: 1 };
  async function inquiriesPage(app) {
    if (!await guard(app, '#/admin/inquiries')) return;
    seo('Inquiry RFQ | Admin Nusa Vanilla', 'Kelola permintaan penawaran');
    app.innerHTML = shell('inquiries', `<h1>Inquiry RFQ</h1><div class="a-tools"><label for="fs" class="a-label" style="margin:0">Status</label><select id="fs" style="width:auto"><option value="">Semua</option>${Object.keys(L.STATUS_FLOW).map(s => `<option value="${s}" ${state.status === s ? 'selected' : ''}>${L.STATUS_LABEL[s]}</option>`).join('')}</select></div><div id="list">${skeleton}</div>`); bindShell(app);
    $('#fs', app).onchange = e => { state.status = e.target.value; state.page = 1; inquiriesPage(app); };
    let r;
    try { r = await D.inquiries({ status: state.status, page: state.page }); } catch (e) { $('#list', app).innerHTML = errBox(e.message); $('[data-retry]', app).onclick = () => inquiriesPage(app); return; }
    $('#list', app).innerHTML = r.items.length ? `<div class="a-card a-tbl-wrap"><table class="a-tbl"><tr><th>Nomor</th><th>Tanggal</th><th>Perusahaan</th><th>Produk</th><th class="num">Kg</th><th class="num">Estimasi</th><th>Status</th><th></th></tr>
      ${r.items.map(i => `<tr><td>${esc(i.inquiry_number)}</td><td>${fmtDate(i.created_at)}</td><td>${esc(i.company_name)}<br><small>${esc(i.country)}</small></td><td>${esc(i.vanilla_products?.name)}</td><td class="num">${nf(i.quantity_kg)}</td><td class="num">${usd(L.estimate(i.quantity_kg, i.price_snapshot_at_inquiry))}</td><td>${badge(i.status)}</td><td><button class="a-btn" data-open="${i.id}">Detail</button></td></tr>`).join('')}</table>
      <div class="a-tools" style="margin:12px 0 0"><span class="grow">${r.total} RFQ · halaman ${r.page} dari ${r.totalPages}</span><button class="a-btn" data-p="-1" ${r.page <= 1 ? 'disabled' : ''}>Sebelumnya</button><button class="a-btn" data-p="1" ${r.page >= r.totalPages ? 'disabled' : ''}>Berikutnya</button></div></div>`
      : `<div class="a-card a-empty">${state.status ? 'Tidak ada RFQ dengan status ini.' : 'Belum ada RFQ. Permintaan dari pembeli akan muncul di sini.'}</div>`;
    $('#list', app).addEventListener('click', e => {
      const pg = e.target.closest('[data-p]'); if (pg) { state.page += +pg.dataset.p; inquiriesPage(app); }
      const o = e.target.closest('[data-open]'); if (o) detail(r.items.find(i => i.id === o.dataset.open), () => inquiriesPage(app));
    });
  }
  function detail(i, done) {
    const bg = document.createElement('div'); bg.className = 'a-modal-bg';
    const next = L.STATUS_FLOW[i.status];
    bg.innerHTML = `<div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="dt-h"><h2 id="dt-h">${esc(i.inquiry_number)}</h2><p style="margin:4px 0 12px">${badge(i.status)} <small>${fmtDate(i.created_at)}</small></p>
      <table class="a-tbl">${[['Perusahaan', i.company_name], ['Kontak', i.contact_name], ['Email', i.email], ['Telepon', i.phone], ['Negara tujuan', i.country], ['Produk', i.vanilla_products?.name], ['Kuantitas', nf(i.quantity_kg) + ' kg'], ['Harga saat diajukan', usd(i.price_snapshot_at_inquiry) + '/kg'], ['Estimasi indikatif', usd(L.estimate(i.quantity_kg, i.price_snapshot_at_inquiry))], ['Catatan', i.notes || '-']].map(([k, v]) => `<tr><th>${k}</th><td style="white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table>
      <div class="a-err" id="dt-e" role="alert"></div>
      <div class="a-actions">${next.map(s => `<button class="a-btn ${s === 'CANCELLED' ? 'bad' : 'pri'}" data-to="${s}">${s === 'CANCELLED' ? 'Batalkan' : 'Tandai: ' + L.STATUS_LABEL[s]}</button>`).join('')}<button class="a-btn" data-no>Tutup</button></div></div>`;
    document.body.appendChild(bg);
    bg.addEventListener('click', async e => {
      if (e.target === bg || e.target.dataset.no != null) return bg.remove();
      const to = e.target.dataset.to; if (!to) return;
      if (to === 'CANCELLED' && !await confirmBox('Batalkan RFQ ini? Status tidak bisa dikembalikan.', 'Batalkan RFQ')) return;
      e.target.disabled = true;
      try { await D.setInquiryStatus(i.id, to); toast('Status diperbarui'); bg.remove(); done(); } catch (err) { $('#dt-e', bg).textContent = err.message; e.target.disabled = false; }
    });
  }

  function bindShell(app) { const o = $('#out', app); o.onclick = async e => { e.preventDefault(); await D.logout(); location.hash = '#/admin/login'; }; }

  window.NVAdmin = { login, dashboard, productsPage, inquiriesPage };
})();
