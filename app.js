/* Nusa Vanilla — marketplace + admin + PRD generator. Data lives in localStorage. */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = n => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const uid = p => p + Math.random().toString(36).slice(2, 8).toUpperCase();

/* ---------- data ---------- */
const SEED = {
  settings: { adminUser: 'admin', adminPass: 'admin123', idrRate: 16000, whatsapp: '+62 812 0000 0000', email: 'export@nusavanilla.example' },
  sellers: [
    { id: 'S1', name: 'Koperasi Tani Vanili Flores', region: 'Flores, NTT', status: 'approved', contact: 'flores@example.com' },
    { id: 'S2', name: 'Bali Spice Growers', region: 'Bali', status: 'approved', contact: 'bali@example.com' },
    { id: 'S3', name: 'Papua Highland Vanilla', region: 'Papua', status: 'approved', contact: 'papua@example.com' },
    { id: 'S4', name: 'Java Aroma Co-op', region: 'Central Java', status: 'pending', contact: 'java@example.com' }
  ],
  products: [
    { id: 'P1', name: 'Planifolia Gourmet Beans — Grade A', category: 'Whole Beans', species: 'V. planifolia', grade: 'Grade A (Gourmet)', length: '16–20 cm', moisture: '30–35%', vanillin: '1.8–2.2%', price: 285, moq: 5, stock: 120, sellerId: 'S1', hue: 28, status: 'published', desc: 'Plump, oily, dark-brown beans with rich creamy-sweet aroma. Ideal for premium retail, patisserie and ice cream.' },
    { id: 'P2', name: 'Planifolia Extraction Beans — Grade B', category: 'Whole Beans', species: 'V. planifolia', grade: 'Grade B (Extraction)', length: '12–16 cm', moisture: '20–25%', vanillin: '1.5–1.9%', price: 115, moq: 10, stock: 300, sellerId: 'S2', hue: 22, status: 'published', desc: 'Drier beans with high vanillin yield, suited for extract and flavor manufacturing.' },
    { id: 'P3', name: 'Tahitensis Beans — Grade A', category: 'Whole Beans', species: 'V. tahitensis', grade: 'Grade A (Gourmet)', length: '14–18 cm', moisture: '32–38%', vanillin: '1.2–1.6%', price: 340, moq: 3, stock: 45, sellerId: 'S3', hue: 340, status: 'published', desc: 'Floral, fruity and cherry-like profile from Papua highlands. Prized by chefs and perfumers.' },
    { id: 'P4', name: 'Vanilla Powder (Ground Beans)', category: 'Powder', species: 'V. planifolia', grade: 'Food grade', length: '—', moisture: '≤ 8%', vanillin: '1.6%', price: 190, moq: 10, stock: 80, sellerId: 'S2', hue: 38, status: 'published', desc: '100% ground whole beans, no additives. Great for baking, beverages and cosmetics.' },
    { id: 'P5', name: 'Pure Vanilla Extract (1x Fold)', category: 'Extract', species: 'V. planifolia', grade: 'Food grade', length: '—', moisture: '—', vanillin: '≥ 35 g/L beans', price: 95, moq: 20, stock: 200, sellerId: 'S1', hue: 18, status: 'published', desc: 'Bulk extract in 5L / 20L containers. Private-label bottling available on request.' },
    { id: 'P6', name: 'Vanilla Cuts & Splits', category: 'Cuts & Splits', species: 'V. planifolia', grade: 'Grade B/C', length: '< 12 cm', moisture: '18–22%', vanillin: '1.4–1.8%', price: 75, moq: 25, stock: 400, sellerId: 'S3', hue: 30, status: 'published', desc: 'Economical broken beans for extraction and industrial flavoring.' }
  ],
  orders: [
    { id: 'ORD-A1B2C3', created: Date.now() - 86400000 * 6, status: 'Shipped', incoterm: 'CIF', items: [{ pid: 'P1', qty: 20 }], total: 5700, buyer: { name: 'Hans Becker', company: 'Becker Gewürze GmbH', email: 'hans@example.de', country: 'Germany', port: 'Hamburg', notes: '' } },
    { id: 'ORD-D4E5F6', created: Date.now() - 86400000 * 2, status: 'New', incoterm: 'FOB', items: [{ pid: 'P2', qty: 50 }, { pid: 'P6', qty: 50 }], total: 9500, buyer: { name: 'Sara Whitman', company: 'Whitman Flavors', email: 'sara@example.com', country: 'United States', port: 'Los Angeles', notes: 'Need COA and phytosanitary certificate.' } }
  ]
};
/* ---------- Supabase ---------- */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let db = { settings: { idrRate: 16000, email: '', whatsapp: '' }, sellers: [], products: [], orders: [] };
let admin = false;
const fromProd = r => ({ id: r.id, name: r.name, category: r.category, species: r.species, grade: r.grade, length: r.length, moisture: r.moisture, vanillin: r.vanillin, price: +r.price, moq: +r.moq, stock: +r.stock, sellerId: r.seller_id, hue: r.hue, image: r.image, status: r.status, desc: r.description });
const toProd = p => ({ id: p.id, name: p.name, category: p.category, species: p.species, grade: p.grade, length: p.length, moisture: p.moisture, vanillin: p.vanillin, price: p.price, moq: p.moq, stock: p.stock, seller_id: p.sellerId, hue: p.hue, image: p.image || null, status: p.status, description: p.desc });
const fromOrder = r => ({ id: r.id, created: Date.parse(r.created_at), status: r.status, incoterm: r.incoterm, items: r.items, total: +r.total, buyer: r.buyer });
async function refresh() {
  const [p, s, o, st] = await Promise.all([
    sb.from('products').select('*').order('created_at'),
    sb.from('sellers').select('*').order('created_at'),
    admin ? sb.from('orders').select('*').order('created_at', { ascending: false }) : { data: [] },
    sb.from('settings').select('*').eq('id', 1).maybeSingle()
  ]);
  const err = p.error || s.error || o.error;
  if (err) toast(err.message);
  db.products = (p.data || []).map(fromProd);
  db.sellers = s.data || [];
  db.orders = (o.data || []).map(fromOrder);
  if (st.data) db.settings = { idrRate: +st.data.idr_rate, email: st.data.email, whatsapp: st.data.whatsapp };
}
const run = async q => { const { error } = await q; if (error) { toast(error.message); return false; } return true; };
let cart = (() => { try { return JSON.parse(localStorage.getItem('nv_cart')) || []; } catch { return []; } })();
const saveCart = () => { try { localStorage.setItem('nv_cart', JSON.stringify(cart)); } catch {} updateCount(); };
const updateCount = () => { $('#cartCount').textContent = cart.length; };
const isAdmin = () => admin;
const product = id => db.products.find(p => p.id === id);
const seller = id => db.sellers.find(s => s.id === id);
const orderTotal = items => items.reduce((a, i) => a + (product(i.pid)?.price || 0) * i.qty, 0);
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200); };
const dl = (name, text, type = 'text/markdown') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href); };

/* ---------- visuals ---------- */
const podSvg = (hue, w = 120) => `<svg width="${w}" viewBox="0 0 120 120" aria-hidden="true">
  <rect width="120" height="120" rx="16" fill="hsl(${hue} 55% 88%)"/>
  <path d="M22 96 C 40 70, 60 48, 98 22" stroke="hsl(${hue} 45% 22%)" stroke-width="9" stroke-linecap="round" fill="none"/>
  <path d="M30 100 C 52 78, 72 58, 104 34" stroke="hsl(${hue} 40% 32%)" stroke-width="7" stroke-linecap="round" fill="none"/>
  <circle cx="92" cy="94" r="7" fill="hsl(${hue + 20} 70% 70%)"/><circle cx="102" cy="82" r="4" fill="hsl(${hue + 20} 70% 78%)"/></svg>`;
const img = p => p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">` : podSvg(p.hue ?? 28, 140);

/* ---------- router ---------- */
const routes = [
  [/^#\/product\/(.+)$/, productPage], [/^#\/cart$/, cartPage], [/^#\/about$/, aboutPage],
  [/^#\/prd$/, prdPage], [/^#\/admin(?:\/(\w+))?$/, adminPage], [/^#?\/?$/, shopPage]
];
function route() {
  const h = location.hash || '#/';
  for (const [re, fn] of routes) { const m = h.match(re); if (m) { fn(...m.slice(1)); window.scrollTo(0, 0); return; } }
  shopPage();
}
addEventListener('hashchange', route);

/* ---------- storefront ---------- */
let filt = { q: '', cat: '', grade: '' };
function shopPage() {
  const cats = [...new Set(db.products.map(p => p.category))];
  const vis = db.products.filter(p => p.status === 'published' && seller(p.sellerId)?.status === 'approved');
  $('#app').innerHTML = `
  <section class="hero">
    <div>
      <span class="tag">Indonesia → World</span>
      <h1>Premium Indonesian vanilla, sourced directly from the farm.</h1>
      <p>Order planifolia and tahitensis beans, powder and extract from verified cooperatives in Flores, Bali, Papua and Java. Request a quote, get a proforma invoice, ship worldwide.</p>
      <div class="actions"><a class="btn" href="#/" onclick="event.preventDefault();document.getElementById('shop').scrollIntoView({behavior:'smooth'})">Browse products</a><a class="btn ghost" href="#/about">How export works</a></div>
      <div class="stats"><div><b>${db.sellers.filter(s => s.status === 'approved').length}</b><span class="muted">verified sellers</span></div><div><b>${vis.length}</b><span class="muted">products</span></div><div><b>FOB · CIF</b><span class="muted">incoterms</span></div></div>
    </div>
    <div class="art">${podSvg(28, 260)}</div>
  </section>
  <section id="shop">
    <h2>Marketplace</h2>
    <div class="filters">
      <input id="fq" placeholder="Search products…" value="${esc(filt.q)}">
      <select id="fc"><option value="">All categories</option>${cats.map(c => `<option ${filt.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <select id="fg"><option value="">All grades</option>${[...new Set(vis.map(p => p.grade))].map(c => `<option ${filt.grade === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
    </div>
    <div class="grid" id="plist"></div>
  </section>`;
  const draw = () => {
    const l = vis.filter(p => (!filt.q || (p.name + p.species + p.desc).toLowerCase().includes(filt.q.toLowerCase())) && (!filt.cat || p.category === filt.cat) && (!filt.grade || p.grade === filt.grade));
    $('#plist').innerHTML = l.map(p => `<article class="card">
      <a class="img" href="#/product/${p.id}" style="background:hsl(${p.hue ?? 28} 55% 92%)">${img(p)}</a>
      <div class="body"><span class="tag">${esc(p.grade)}</span>
        <h3><a href="#/product/${p.id}" style="text-decoration:none">${esc(p.name)}</a></h3>
        <div class="muted">${esc(seller(p.sellerId)?.name)} · ${esc(seller(p.sellerId)?.region)}</div>
        <div class="row"><div class="price">${usd(p.price)}<small> /kg · MOQ ${p.moq} kg</small></div>
        <button class="btn sm gold" data-add="${p.id}">Add</button></div></div></article>`).join('') || '<p class="muted">No products match.</p>';
  };
  draw();
  $('#fq').oninput = e => { filt.q = e.target.value; draw(); };
  $('#fc').onchange = e => { filt.cat = e.target.value; draw(); };
  $('#fg').onchange = e => { filt.grade = e.target.value; draw(); };
  $('#plist').onclick = e => { const id = e.target.dataset.add; if (id) addToCart(id); };
}
function addToCart(id, qty) {
  const p = product(id); const ex = cart.find(c => c.pid === id);
  if (ex) ex.qty += qty || 0; else cart.push({ pid: id, qty: qty || p.moq });
  saveCart(); toast('Added to inquiry list');
}
function productPage(id) {
  const p = product(id); if (!p) return shopPage();
  const s = seller(p.sellerId);
  $('#app').innerHTML = `<p><a href="#/">← Back</a></p><div class="two">
    <div class="panel" style="background:hsl(${p.hue ?? 28} 55% 92%);display:flex;justify-content:center;align-items:center">${img(p)}</div>
    <div><span class="tag">${esc(p.grade)}</span><h1 style="font-size:2rem">${esc(p.name)}</h1>
      <p>${esc(p.desc)}</p>
      <table><tr><th>Species</th><td>${esc(p.species)}</td></tr><tr><th>Length</th><td>${esc(p.length)}</td></tr><tr><th>Moisture</th><td>${esc(p.moisture)}</td></tr><tr><th>Vanillin</th><td>${esc(p.vanillin)}</td></tr><tr><th>Stock</th><td>${p.stock} kg</td></tr><tr><th>Seller</th><td>${esc(s?.name)} (${esc(s?.region)})</td></tr></table>
      <p class="price" style="margin:16px 0 4px">${usd(p.price)} <small>/kg · MOQ ${p.moq} kg · ex-works Indonesia</small></p>
      <label>Quantity (kg)</label><input id="qty" type="number" min="${p.moq}" value="${p.moq}" style="max-width:140px">
      <div class="actions"><button class="btn gold" id="add">Add to inquiry</button><a class="btn ghost" href="#/cart">View inquiry</a></div></div></div>`;
  $('#add').onclick = () => addToCart(p.id, Math.max(p.moq, +$('#qty').value || p.moq));
}
function cartPage() {
  const rows = cart.map((c, i) => ({ ...c, i, p: product(c.pid) })).filter(r => r.p);
  $('#app').innerHTML = `<h2>Inquiry / Order request</h2>${!rows.length ? '<p class="muted">Your list is empty. <a href="#/">Browse products</a></p>' : `
  <div class="two"><div class="panel tablewrap"><table><tr><th>Product</th><th>Qty (kg)</th><th>Subtotal</th><th></th></tr>
    ${rows.map(r => `<tr><td>${esc(r.p.name)}<br><span class="muted">MOQ ${r.p.moq} kg</span></td><td><input type="number" min="${r.p.moq}" value="${r.qty}" data-q="${r.i}" style="width:90px"></td><td>${usd(r.p.price * r.qty)}</td><td><button class="btn sm ghost" data-rm="${r.i}">✕</button></td></tr>`).join('')}
    <tr><th colspan="2">Estimated total (ex-works)</th><th colspan="2" class="price">${usd(orderTotal(cart))}</th></tr></table>
    <p class="muted">Final price includes freight, insurance and certificates per Incoterm; you will receive a proforma invoice.</p></div>
  <form class="panel" id="f"><h3>Buyer details</h3>
    <label>Full name</label><input name="name" required><label>Company</label><input name="company" required>
    <label>Email</label><input name="email" type="email" required><label>Country</label><input name="country" required>
    <div class="two" style="gap:12px"><div><label>Destination port</label><input name="port"></div>
    <div><label>Incoterm</label><select name="incoterm"><option>FOB</option><option>CIF</option><option>CFR</option><option>EXW</option></select></div></div>
    <label>Notes (certificates, packaging…)</label><textarea name="notes" rows="3"></textarea>
    <div class="actions"><button class="btn gold">Send request</button></div></form></div>`}`;
  if (!rows.length) return;
  $('.panel table').onchange = e => { if (e.target.dataset.q != null) { cart[e.target.dataset.q].qty = Math.max(1, +e.target.value || 1); saveCart(); cartPage(); } };
  $('.panel table').onclick = e => { if (e.target.dataset.rm != null) { cart.splice(e.target.dataset.rm, 1); saveCart(); cartPage(); } };
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    for (const c of cart) { const p = product(c.pid); if (c.qty < p.moq) return toast(`${p.name}: minimum ${p.moq} kg`); }
    const { incoterm, ...buyer } = d;
    const o = { id: 'ORD-' + uid(''), created: Date.now(), status: 'New', incoterm, items: structuredClone(cart), total: orderTotal(cart), buyer };
    if (!await run(sb.from('orders').insert({ id: o.id, status: o.status, incoterm, items: o.items, total: o.total, buyer }))) return;
    cart = []; saveCart();
    $('#app').innerHTML = `<div class="panel login"><h2>Thank you!</h2><p>Your request <b>${o.id}</b> was received. Our export team will send a proforma invoice to <b>${esc(buyer.email)}</b> within 1–2 business days.</p><a class="btn" href="#/">Back to marketplace</a></div>`;
  };
}
function aboutPage() {
  $('#app').innerHTML = `<h2>How exporting vanilla works</h2><div class="three">
  ${[['1. Browse & request', 'Choose beans, powder or extract and send an inquiry with your destination and Incoterm.'], ['2. Quote & sample', 'We confirm availability, send a proforma invoice and optional samples with lab analysis (COA).'], ['3. Payment & packing', 'Pay by T/T or L/C. Goods are cured, graded, vacuum-packed and prepared with export documents.'], ['4. Shipping', 'Phytosanitary certificate, Certificate of Origin and customs clearance handled; ship via air or sea.'], ['5. Quality promise', 'Every lot is traceable to the farmer cooperative and graded by length, moisture and vanillin.'], ['6. Support', `Questions? ${esc(db.settings.email)} · ${esc(db.settings.whatsapp)}`]].map(([t, d]) => `<div class="panel"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>`;
}

/* ---------- admin ---------- */
const ST = ['New', 'Quoted', 'Paid', 'Shipped', 'Completed', 'Cancelled'];
const stTag = s => `<span class="tag ${{ New: 'warn', Quoted: '', Paid: 'ok', Shipped: 'ok', Completed: 'ok', Cancelled: 'bad', approved: 'ok', pending: 'warn', rejected: 'bad', published: 'ok', draft: 'warn' }[s] || ''}">${esc(s)}</span>`;
function adminPage(tab = 'dashboard') {
  if (!isAdmin()) return loginPage();
  const tabs = [['dashboard', 'Dashboard'], ['orders', 'Orders'], ['products', 'Products'], ['sellers', 'Sellers'], ['prd', 'PRD Generator'], ['settings', 'Settings']];
  if (!tabs.some(t => t[0] === tab)) tab = 'dashboard';
  if (tab === 'prd') return location.hash = '#/prd';
  $('#app').innerHTML = `<div class="admin"><aside class="side">${tabs.map(([k, l]) => `<a class="${k === tab ? 'on' : ''}" href="#/admin/${k}">${l}</a>`).join('')}<a href="#" id="out">Logout</a></aside><section id="adm"></section></div>`;
  $('#out').onclick = async e => { e.preventDefault(); await sb.auth.signOut(); admin = false; await refresh(); location.hash = '#/'; };
  ({ dashboard: admDash, orders: admOrders, products: admProducts, sellers: admSellers, settings: admSettings })[tab]();
}
function loginPage() {
  $('#app').innerHTML = `<form class="panel login" id="lf"><h2>Administrator</h2><label>Email</label><input name="u" type="email" autocomplete="username"><label>Password</label><input name="p" type="password" autocomplete="current-password"><div class="actions"><button class="btn">Login</button></div><p class="muted">Login memakai akun Supabase Auth yang terdaftar di tabel <code>admins</code>.</p></form>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    const { error } = await sb.auth.signInWithPassword({ email: f.get('u'), password: f.get('p') });
    if (error) return toast(error.message);
    admin = await checkAdmin();
    if (!admin) { await sb.auth.signOut(); return toast('Akun ini bukan admin'); }
    await refresh(); adminPage();
  };
}
function admDash() {
  const rev = db.orders.filter(o => ['Paid', 'Shipped', 'Completed'].includes(o.status)).reduce((a, o) => a + o.total, 0);
  const byCountry = {}; db.orders.forEach(o => byCountry[o.buyer.country] = (byCountry[o.buyer.country] || 0) + o.total);
  const max = Math.max(1, ...Object.values(byCountry));
  $('#adm').innerHTML = `<h2>Dashboard</h2><div class="kpis">
  <div class="panel kpi"><span class="muted">Orders</span><b>${db.orders.length}</b></div>
  <div class="panel kpi"><span class="muted">New requests</span><b>${db.orders.filter(o => o.status === 'New').length}</b></div>
  <div class="panel kpi"><span class="muted">Confirmed revenue</span><b>${usd(rev)}</b><span class="muted">≈ Rp ${(rev * db.settings.idrRate).toLocaleString('id-ID')}</span></div>
  <div class="panel kpi"><span class="muted">Pending sellers</span><b>${db.sellers.filter(s => s.status === 'pending').length}</b></div></div>
  <div class="panel"><h3>Order value by destination</h3><div class="bars">${Object.entries(byCountry).map(([c, v]) => `<div class="bar"><span>${esc(c)}</span><i style="width:${v / max * 100}%"></i><span>${usd(v)}</span></div>`).join('') || '<span class="muted">No data</span>'}</div></div>`;
}
function admOrders() {
  $('#adm').innerHTML = `<h2>Orders</h2><div class="panel tablewrap"><table><tr><th>ID</th><th>Date</th><th>Buyer</th><th>Items</th><th>Total</th><th>Status</th></tr>
  ${db.orders.map(o => `<tr><td><a href="#" data-o="${o.id}">${o.id}</a></td><td>${new Date(o.created).toLocaleDateString()}</td><td>${esc(o.buyer.company)}<br><span class="muted">${esc(o.buyer.country)}</span></td><td>${o.items.map(i => `${esc(product(i.pid)?.name || i.pid)} × ${i.qty}kg`).join('<br>')}</td><td>${usd(o.total)}<br><span class="muted">${o.incoterm}</span></td>
  <td><select data-s="${o.id}">${ST.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</table></div>`;
  $('#adm').onchange = async e => { const id = e.target.dataset.s; if (id && await run(sb.from('orders').update({ status: e.target.value }).eq('id', id))) { db.orders.find(o => o.id === id).status = e.target.value; toast('Status updated'); } };
  $('#adm').onclick = e => { const id = e.target.dataset.o; if (!id) return; e.preventDefault(); const o = db.orders.find(x => x.id === id), b = o.buyer;
    modal(`<h3>${o.id}</h3><p><b>${esc(b.name)}</b>, ${esc(b.company)}<br>${esc(b.email)} · ${esc(b.country)} (${esc(b.port || '—')})</p><p>${esc(b.notes || 'No notes.')}</p><p>Total ${usd(o.total)} · ${o.incoterm} · ${stTag(o.status)}</p>`); };
}
function modal(html, onMount) {
  const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="panel">${html}<div class="actions"><button class="btn ghost" data-close>Close</button></div></div>`;
  m.onclick = e => { if (e.target === m || e.target.dataset.close != null) m.remove(); };
  document.body.append(m); onMount?.(m); return m;
}
function admProducts() {
  $('#adm').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2>Products</h2><button class="btn gold" id="np">+ New product</button></div>
  <div class="panel tablewrap"><table><tr><th>Name</th><th>Seller</th><th>Price/kg</th><th>MOQ</th><th>Stock</th><th>Status</th><th></th></tr>
  ${db.products.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(seller(p.sellerId)?.name)}</td><td>${usd(p.price)}</td><td>${p.moq}</td><td>${p.stock}</td><td>${stTag(p.status)}</td><td><button class="btn sm ghost" data-e="${p.id}">Edit</button> <button class="btn sm danger" data-d="${p.id}">Del</button></td></tr>`).join('')}</table></div>`;
  $('#np').onclick = () => prodForm();
  $('#adm').onclick = async e => {
    if (e.target.dataset.e) prodForm(product(e.target.dataset.e));
    if (e.target.dataset.d && confirm('Delete this product?') && await run(sb.from('products').delete().eq('id', e.target.dataset.d))) { await refresh(); admProducts(); }
  };
}
function prodForm(p = {}) {
  const f = (k, l, t = 'text') => `<label>${l}</label><input name="${k}" type="${t}" value="${esc(p[k] ?? '')}">`;
  const m = modal(`<h3>${p.id ? 'Edit' : 'New'} product</h3><form id="pf">${f('name', 'Name')}${f('category', 'Category')}${f('species', 'Species')}${f('grade', 'Grade')}
  <div class="three">${f('length', 'Length')}${f('moisture', 'Moisture')}${f('vanillin', 'Vanillin')}</div>
  <div class="three">${f('price', 'Price USD/kg', 'number')}${f('moq', 'MOQ kg', 'number')}${f('stock', 'Stock kg', 'number')}</div>
  ${f('image', 'Image URL (optional)')}<label>Seller</label><select name="sellerId">${db.sellers.map(s => `<option value="${s.id}" ${s.id === p.sellerId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
  <label>Status</label><select name="status"><option ${p.status === 'published' ? 'selected' : ''}>published</option><option ${p.status === 'draft' ? 'selected' : ''}>draft</option></select>
  <label>Description</label><textarea name="desc" rows="3">${esc(p.desc || '')}</textarea><div class="actions"><button class="btn gold">Save</button></div></form>`);
  $('#pf', m).onsubmit = async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); ['price', 'moq', 'stock'].forEach(k => d[k] = +d[k] || 0);
    const row = p.id ? { ...p, ...d } : { id: uid('P'), hue: Math.floor(Math.random() * 360), ...d };
    if (!await run(sb.from('products').upsert(toProd(row)))) return;
    await refresh(); m.remove(); admProducts();
  };
}
function admSellers() {
  $('#adm').innerHTML = `<h2>Sellers</h2><div class="panel tablewrap"><table><tr><th>Name</th><th>Region</th><th>Contact</th><th>Status</th><th></th></tr>
  ${db.sellers.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.region)}</td><td>${esc(s.contact)}</td><td>${stTag(s.status)}</td><td>
  ${s.status !== 'approved' ? `<button class="btn sm gold" data-a="${s.id}">Approve</button> ` : ''}${s.status !== 'rejected' ? `<button class="btn sm ghost" data-r="${s.id}">Reject</button>` : ''}</td></tr>`).join('')}</table></div>
  <form class="panel" id="sf" style="margin-top:16px"><h3>Add seller</h3><div class="three"><div><label>Name</label><input name="name" required></div><div><label>Region</label><input name="region"></div><div><label>Contact</label><input name="contact"></div></div><div class="actions"><button class="btn">Add</button></div></form>`;
  $('#adm').onclick = async e => { const a = e.target.dataset.a, r = e.target.dataset.r; if ((a || r) && await run(sb.from('sellers').update({ status: a ? 'approved' : 'rejected' }).eq('id', a || r))) { await refresh(); admSellers(); } };
  $('#sf').onsubmit = async e => { e.preventDefault(); if (await run(sb.from('sellers').insert({ id: uid('S'), status: 'pending', ...Object.fromEntries(new FormData(e.target)) }))) { await refresh(); admSellers(); } };
}
function admSettings() {
  const s = db.settings;
  $('#adm').innerHTML = `<h2>Settings</h2><form class="panel" id="st" style="max-width:520px">
  ${[['idrRate', 'IDR per USD'], ['email', 'Contact email'], ['whatsapp', 'WhatsApp']].map(([k, l]) => `<label>${l}</label><input name="${k}" value="${esc(s[k])}">`).join('')}
  <div class="actions"><button class="btn gold">Save</button><button type="button" class="btn ghost" id="rs">Import demo products</button></div></form>`;
  $('#st').onsubmit = async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    if (await run(sb.from('settings').upsert({ id: 1, idr_rate: +d.idrRate || 16000, email: d.email, whatsapp: d.whatsapp }))) { await refresh(); toast('Saved'); }
  };
  $('#rs').onclick = async () => {
    if (!confirm('Tambahkan sampel penjual & produk ke database?')) return;
    const ok = await run(sb.from('sellers').upsert(SEED.sellers.map(({ id, name, region, status, contact }) => ({ id, name, region, status, contact })))) && await run(sb.from('products').upsert(SEED.products.map(toProd)));
    if (ok) { await refresh(); toast('Demo data ditambahkan'); }
  };
}

/* ---------- PRD generator ---------- */
const PRD_FEATURES = [
  'Product catalog with filters & search', 'Inquiry / RFQ cart', 'Online payment (T/T, L/C, escrow)', 'Seller onboarding & verification',
  'Admin dashboard & order management', 'Multi-currency (USD/EUR/IDR)', 'Shipping & Incoterm calculator', 'Export document generator (invoice, packing list, COA)',
  'Sample request flow', 'Buyer accounts & order tracking', 'Multi-language (EN/ID/DE/AR)', 'Quality grading & lot traceability', 'Email / WhatsApp notifications', 'Reviews & ratings'
];
const PRD_DEFAULT = {
  name: 'Nusa Vanilla Export Marketplace', owner: '', date: new Date().toISOString().slice(0, 10),
  problem: 'Indonesian vanilla farmers and exporters struggle to reach international buyers directly, depending on intermediaries that take large margins and limit price transparency. Buyers abroad find it hard to verify origin, grade and reliable supply.',
  vision: 'The most trusted B2B marketplace for Indonesian vanilla, connecting verified producers with global food, flavor and cosmetic buyers.',
  markets: 'USA, Germany, Netherlands, France, UAE, Japan', personas: 'Importer / flavor manufacturer (B2B buyer)\nSpecialty retailer & chef\nFarmer cooperative / exporter (seller)\nPlatform administrator',
  goals: 'Onboard 20 verified sellers in 6 months\nProcess 50 export orders in the first year\nReduce quote-to-order time to under 3 days\nReach USD 500k GMV in year one',
  metrics: 'GMV, number of orders, RFQ-to-order conversion, repeat buyer rate, average response time', stack: 'Frontend: HTML/JS or Next.js; Backend: Node.js + PostgreSQL; Hosting: cloud VPS; Payments: Stripe / Wise / bank T/T',
  timeline: 'Week 1–2: Discovery & design\nWeek 3–6: MVP marketplace + admin\nWeek 7–8: Pilot with 3 sellers\nWeek 9–12: Launch & marketing', risks: 'Fluctuating vanilla prices\nExport regulation & phytosanitary compliance\nPayment fraud on cross-border orders\nQuality inconsistency between lots',
  features: [0, 1, 3, 4, 7, 11]
};
function prdPage() {
  let d; try { d = { ...PRD_DEFAULT, ...JSON.parse(localStorage.getItem('nv_prd')) }; } catch { d = PRD_DEFAULT; }
  const ta = (k, l, r = 3) => `<label>${l}</label><textarea name="${k}" rows="${r}">${esc(d[k])}</textarea>`;
  $('#app').innerHTML = `<h2>PRD Generator</h2><p class="muted">Isi form, dokumen PRD (Markdown) langsung dibuat. Sudah terisi contoh untuk ekspor vanili Indonesia.</p>
  <div class="two"><form class="panel" id="pf">
    <div class="two" style="gap:12px"><div><label>Nama produk</label><input name="name" value="${esc(d.name)}"></div><div><label>Penanggung jawab</label><input name="owner" value="${esc(d.owner)}"></div></div>
    ${ta('problem', 'Masalah')}${ta('vision', 'Visi', 2)}
    <label>Pasar tujuan</label><input name="markets" value="${esc(d.markets)}">
    ${ta('personas', 'Pengguna (satu per baris)', 4)}${ta('goals', 'Tujuan (satu per baris)', 4)}
    <label>Fitur</label><div class="checks">${PRD_FEATURES.map((f, i) => `<label><input type="checkbox" name="feat" value="${i}" ${d.features.includes(i) ? 'checked' : ''}> ${f}</label>`).join('')}</div>
    <label>Fitur tambahan (satu per baris)</label><textarea name="extra" rows="2">${esc(d.extra || '')}</textarea>
    ${ta('metrics', 'Metrik keberhasilan', 2)}${ta('stack', 'Tech stack', 2)}${ta('timeline', 'Timeline', 4)}${ta('risks', 'Risiko', 4)}
  </form><div><div class="actions" style="margin-top:0"><button class="btn gold" id="cp">Copy</button><button class="btn" id="dlm">Download .md</button><button class="btn ghost" id="rst">Reset</button></div><pre class="out" id="out" style="margin-top:12px"></pre></div></div>`;
  const read = () => { const f = new FormData($('#pf')); const o = Object.fromEntries([...f].filter(([k]) => k !== 'feat')); o.features = f.getAll('feat').map(Number); o.date = d.date; return o; };
  const render = () => { const o = read(); try { localStorage.setItem('nv_prd', JSON.stringify(o)); } catch {} $('#out').textContent = buildPrd(o); };
  $('#pf').oninput = render; render();
  $('#cp').onclick = () => navigator.clipboard.writeText($('#out').textContent).then(() => toast('Disalin'), () => toast('Gagal menyalin'));
  $('#dlm').onclick = () => dl('PRD-' + (read().name || 'product').replace(/\W+/g, '-') + '.md', $('#out').textContent);
  $('#rst').onclick = () => { try { localStorage.removeItem('nv_prd'); } catch {} prdPage(); };
}
function buildPrd(o) {
  const L = s => (s || '').split('\n').map(x => x.trim()).filter(Boolean);
  const bl = s => L(s).map(x => `- ${x}`).join('\n') || '- —';
  const feats = [...o.features.map(i => PRD_FEATURES[i]), ...L(o.extra)];
  return `# PRD — ${o.name}

**Penanggung jawab:** ${o.owner || '—'}
**Tanggal:** ${o.date}
**Status:** Draft

## 1. Latar belakang & masalah
${o.problem}

## 2. Visi
${o.vision}

## 3. Pasar tujuan
${o.markets}

## 4. Pengguna
${bl(o.personas)}

## 5. Tujuan
${bl(o.goals)}

## 6. Lingkup fitur
${feats.map(f => `- [ ] ${f}`).join('\n') || '- —'}

### Kebutuhan fungsional utama
- **Marketplace:** pembeli menelusuri produk, melihat grade/harga/MOQ, dan mengirim permintaan penawaran.
- **Admin:** login administrator untuk mengelola produk, penjual, pesanan, dan pengaturan.
- **Pesanan:** status New → Quoted → Paid → Shipped → Completed.

## 7. Kebutuhan non-fungsional
- Responsif (mobile & desktop), waktu muat < 3 detik
- Keamanan: HTTPS, hashing password, kontrol akses berbasis peran
- Kepatuhan ekspor: fitotsanitari, Certificate of Origin, COA

## 8. Metrik keberhasilan
${o.metrics}

## 9. Tech stack
${o.stack}

## 10. Timeline
${bl(o.timeline)}

## 11. Risiko & mitigasi
${bl(o.risks)}

## 12. Pertanyaan terbuka
- Metode pembayaran apa yang diprioritaskan untuk pembeli luar negeri?
- Siapa yang menangani logistik dan dokumen ekspor (in-house atau forwarder)?
`;
}

/* ---------- boot ---------- */
$('#yr').textContent = new Date().getFullYear();
async function checkAdmin() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { data } = await sb.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  return !!data;
}
(async () => {
  updateCount();
  admin = await checkAdmin();
  await refresh();
  route();
})();
