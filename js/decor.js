/* Elemen dekoratif & ilustrasi storefront: seni polong (pengganti foto), peta rute, lencana, sulur, kalkulator. */
(function () {
  const L = window.NVLib;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ───────── konfigurasi statis (bukan dari database) ───────── */
  const DESTINATIONS = [ // CONTOH: pemilik menetapkan negara tujuan sebenarnya
    { name: 'New York, Amerika Serikat', code: 'US', lon: -74, lat: 40.7 },
    { name: 'Hamburg, Jerman', code: 'DE', lon: 10, lat: 53.5 },
    { name: 'Rotterdam, Belanda', code: 'NL', lon: 4.5, lat: 51.9 },
    { name: 'Le Havre, Prancis', code: 'FR', lon: 0.1, lat: 49.5 },
    { name: 'Jebel Ali, Uni Emirat Arab', code: 'AE', lon: 55, lat: 25 },
    { name: 'Yokohama, Jepang', code: 'JP', lon: 139.6, lat: 35.4 }
  ];
  const CERTS = [ // CONTOH: isi hanya sertifikasi yang benar-benar dimiliki. coa_url kosong = tanpa tombol COA.
    { name: 'Organik', year: '', icon: 'leaf', coa_url: '' },
    { name: 'HACCP', year: '', icon: 'shield', coa_url: '' },
    { name: 'Halal', year: '', icon: 'seal', coa_url: '' },
    { name: 'Uji laboratorium (COA)', year: '', icon: 'flask', coa_url: '' }
  ];
  const ICONS = {
    leaf: '<path d="M8 36C8 18 20 8 38 8c0 18-10 30-26 30" /><path d="M8 40 26 22" />',
    shield: '<path d="M24 6 8 12v12c0 10 7 15 16 18 9-3 16-8 16-18V12L24 6Z" /><path d="m17 24 5 5 9-10" />',
    seal: '<circle cx="24" cy="24" r="15" /><path d="m17 24 5 5 9-10" /><path d="M24 4v5M24 39v5M4 24h5M39 24h5" />',
    flask: '<path d="M18 6h12M20 6v12L9 38a3 3 0 0 0 3 5h24a3 3 0 0 0 3-5L28 18V6" /><path d="M14 30h20" />'
  };
  const icon = k => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.seal}</svg>`;

  /* ───────── seni polong (placeholder resmi sampai foto produk tersedia) ───────── */
  const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const PALETTES = [
    { bg1: '#e9dfc6', bg2: '#c9d5b4', pod: '#3b2414', hi: '#7a4d2c' },   // gourmet gelap
    { bg1: '#efe0c8', bg2: '#d9c2a0', pod: '#4a2a1c', hi: '#8a5538' },   // tahitensis kemerahan
    { bg1: '#e7ead2', bg2: '#b9c99d', pod: '#2f2a14', hi: '#6c5a2e' }
  ];
  function art(p, variant = 0) {
    const pal = PALETTES[hash(p.slug || p.name) % PALETTES.length];
    const id = 'g' + (hash(p.slug || p.name) % 9999) + variant;
    const bg = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.bg1}"/><stop offset="1" stop-color="${pal.bg2}"/></linearGradient></defs><rect width="400" height="300" fill="url(#${id})"/>`;
    const powder = /powder|bubuk/i.test(p.name + p.grade);
    let body;
    if (variant === 1) { // makro: satu polong besar berkristal
      body = `<path d="M40 270C120 200 230 110 370 36" stroke="${pal.pod}" stroke-width="58" stroke-linecap="round" fill="none"/>
        <path d="M52 256C130 190 236 108 352 48" stroke="${pal.hi}" stroke-width="10" stroke-linecap="round" fill="none" opacity=".55"/>
        ${[[120, 214], [180, 170], [236, 128], [292, 92], [150, 192], [264, 110]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#f6ead0" opacity=".8"/>`).join('')}`;
    } else if (variant === 2) { // kemasan
      body = `<rect x="130" y="60" width="140" height="190" rx="14" fill="${pal.pod}"/><rect x="130" y="60" width="140" height="34" rx="14" fill="${pal.hi}"/>
        <rect x="150" y="128" width="100" height="64" rx="6" fill="#f3e8cf"/><path d="M162 150h76M162 166h52" stroke="${pal.pod}" stroke-width="5" stroke-linecap="round"/>`;
    } else if (powder) {
      body = `<path d="M60 250c30-70 70-100 140-100s110 30 140 100z" fill="${pal.hi}"/><path d="M90 250c24-46 60-70 110-70" stroke="#f3e0b8" stroke-width="6" fill="none" opacity=".5"/>
        <path d="M250 90 340 52" stroke="${pal.pod}" stroke-width="16" stroke-linecap="round"/>`;
    } else {
      // jumlah, panjang, dan ketebalan polong mengikuti data produk
      const hsh = hash(p.slug || p.name), len = Math.max(6, Number(p.length_cm) || 14), n = Math.max(3, Math.min(7, Math.round(len / 3))), sc = Math.min(1, Math.max(0.5, len / 19));
      const w = 9 + (Number(p.moisture_percentage) || 20) * 0.19, rot = ((hsh % 21) - 10), spread = 150 + (hsh % 5) * 14;
      const pods = Array.from({ length: n }, (_, i) => {
        const t = n === 1 ? 0 : i / (n - 1), x0 = 56 + t * spread, y0 = 284, x1 = x0 + 162 * sc + t * 22, y1 = y0 - 238 * sc + t * 34;
        const d = `M${x0.toFixed(0)} ${y0} C${(x0 + 34).toFixed(0)} ${y0 - 78}, ${(x1 - 120).toFixed(0)} ${(y1 + 92).toFixed(0)}, ${x1.toFixed(0)} ${y1.toFixed(0)}`;
        return `<path d="${d}" stroke="${pal.pod}" stroke-width="${(w - t * 1.5).toFixed(1)}" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${pal.hi}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".5" transform="translate(-3 -3)"/>`;
      }).join('');
      body = `<g transform="rotate(${rot} 200 150)">${pods}<rect x="${96 + spread * 0.38}" y="168" width="${22 + n}" height="58" rx="5" fill="#b8955a" transform="rotate(36 ${110 + spread * 0.38} 196)"/></g>`;
    }
    return `<svg viewBox="0 0 400 300" role="img" aria-label="Ilustrasi ${esc(p.name)}" preserveAspectRatio="xMidYMid slice">${bg}${body}</svg>`;
  }
  const image = (p, v = 0) => (p.image_url && v === 0 ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" width="400" height="300" loading="lazy">` : art(p, v));

  /* ───────── cerita: 4 ilustrasi tahap ───────── */
  const S = (inner) => `<svg viewBox="0 0 400 400" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const STORY_ART = [
    S(`<circle cx="200" cy="200" r="150" fill="#c9d5b4" opacity=".55" stroke="none"/><g stroke="#2e4426" stroke-width="3" fill="#f3e8cf">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="200" cy="130" rx="26" ry="62" transform="rotate(${a} 200 200)"/>`).join('')}</g><circle cx="200" cy="200" r="20" fill="#b8955a" stroke="#2e4426" stroke-width="3"/><path d="M200 300v70M200 330c-30-6-50-20-56-40" stroke="#4a6934" stroke-width="5"/>`),
    S(`<circle cx="200" cy="120" r="46" fill="#e4b95a" stroke="none"/><g stroke="#e4b95a" stroke-width="5">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M200 48v-22" transform="rotate(${a} 200 120)"/>`).join('')}</g><path d="M60 230h280M60 300h280" stroke="#6a4328" stroke-width="6"/><g stroke="#3b2414" stroke-width="12">${[90, 130, 170, 210, 250, 290].map(x => `<path d="M${x} 224v-34M${x - 10} 294v-34"/>`).join('')}</g>`),
    S(`<rect x="50" y="250" width="300" height="46" rx="8" fill="#f3e8cf" stroke="#2e4426" stroke-width="3"/><g stroke="#2e4426" stroke-width="3">${Array.from({ length: 16 }, (_, i) => `<path d="M${70 + i * 18} 250v${i % 5 === 0 ? 24 : 14}"/>`).join('')}</g><path d="M70 214C140 150 240 120 330 80" stroke="#3b2414" stroke-width="22"/><path d="M80 206C150 146 244 118 322 84" stroke="#7a4d2c" stroke-width="3" opacity=".6"/><circle cx="318" cy="330" r="22" stroke="#4a6934" stroke-width="4"/><path d="m308 330 8 8 16-18" stroke="#4a6934" stroke-width="4"/>`),
    S(`<rect x="60" y="160" width="280" height="170" rx="10" fill="#e4d6b9" stroke="#2e4426" stroke-width="3"/><g stroke="#2e4426" stroke-width="3">${[110, 160, 210, 260, 310].map(x => `<path d="M${x} 160v170"/>`).join('')}</g><rect x="60" y="130" width="280" height="30" rx="6" fill="#4a6934" stroke="#2e4426" stroke-width="3"/><path d="M90 345h220" stroke="#6a4328" stroke-width="5"/><rect x="160" y="226" width="80" height="46" rx="5" fill="#f3e8cf" stroke="#2e4426" stroke-width="3"/><path d="M172 244h56M172 258h36" stroke="#2e4426" stroke-width="3"/>`)
  ];

  /* ───────── sulur pemisah (path tergambar sekali) ───────── */
  const vine = () => `<svg class="vine" viewBox="0 0 560 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path pathLength="1" d="M4 20C60 4 100 36 150 20S240 4 280 20 380 36 430 20 510 4 556 20"/><path pathLength="1" d="M150 20c-6-10-4-16 4-18M280 20c-4 10 0 16 8 18M430 20c6-10 4-16-4-18" /></svg>`;

  /* ───────── peta rute ekspor (skematik, bukan peta presisi) ───────── */
  const POLY = {
    na: [[-168, 66], [-141, 70], [-95, 72], [-62, 60], [-56, 52], [-67, 45], [-76, 35], [-81, 26], [-90, 29], [-97, 22], [-87, 21], [-83, 9], [-78, 8], [-92, 15], [-105, 20], [-114, 31], [-124, 40], [-124, 48], [-134, 58], [-150, 60], [-166, 56]],
    gl: [[-55, 60], [-45, 60], [-20, 70], [-22, 82], [-60, 82], [-72, 78]],
    sa: [[-80, 9], [-72, 12], [-62, 10], [-50, 0], [-35, -5], [-39, -14], [-48, -26], [-58, -38], [-65, -42], [-68, -52], [-73, -50], [-71, -30], [-70, -18], [-81, -6]],
    eu: [[-10, 36], [-9, 43], [-2, 48], [4, 52], [10, 56], [5, 62], [14, 68], [30, 71], [60, 69], [100, 77], [140, 72], [180, 67], [178, 62], [160, 57], [142, 52], [135, 44], [128, 36], [122, 31], [121, 24], [109, 21], [106, 11], [100, 14], [104, 1], [98, 8], [94, 18], [88, 22], [80, 15], [77, 8], [72, 20], [66, 25], [58, 25], [52, 24], [56, 18], [44, 12], [35, 28], [36, 36], [27, 37], [20, 40], [12, 44], [3, 43], [-5, 36]],
    af: [[-17, 21], [-10, 30], [-6, 36], [10, 37], [32, 31], [35, 28], [43, 12], [51, 12], [40, -3], [40, -15], [35, -25], [27, -34], [18, -34], [12, -18], [9, -1], [9, 4], [-8, 4], [-17, 14]],
    au: [[114, -22], [122, -18], [131, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [131, -32], [115, -34]],
    sm: [[95, 5], [98, 4], [104, -2], [106, -6], [102, -4], [97, 1]], jv: [[105, -6], [114, -7], [114, -8.5], [106, -7.5]],
    bo: [[109, 2], [117, 7], [119, 1], [116, -3.5], [110, -3]], su: [[119, 1], [125, 1], [121, -2], [123, -5], [120, -5]], pa: [[131, -1], [141, -3], [150, -10], [141, -9], [134, -4]]
  };
  const W = 1000, H = 440, LAT_TOP = 80, LAT_BOT = -58;
  const px = lon => ((lon + 180) / 360) * W;
  const py = lat => ((LAT_TOP - lat) / (LAT_TOP - LAT_BOT)) * H;
  function exportMap() {
    const land = Object.values(POLY).map(pts => `<polygon class="land" points="${pts.map(([lo, la]) => `${px(lo).toFixed(1)},${py(la).toFixed(1)}`).join(' ')}"/>`).join('');
    const grat = [-120, -60, 0, 60, 120].map(lo => `M${px(lo)} 0V${H}`).join('') + [60, 30, 0, -30].map(la => `M0 ${py(la)}H${W}`).join('');
    const ox = px(110), oy = py(-7.5);
    const routes = DESTINATIONS.slice(0, 10).map((d, i) => {
      const x = px(d.lon), y = py(d.lat), mx = (ox + x) / 2, my = Math.min(oy, y) - 70 - Math.abs(x - ox) * 0.06;
      const delay = (i * 0.15).toFixed(2) + 's';
      return `<path class="route" pathLength="1" style="--d:${delay}" d="M${ox.toFixed(1)} ${oy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}"/><circle class="dest" style="--d:${delay}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/>`;
    }).join('');
    return `<div class="map glass" data-map><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Peta skematik rute ekspor dari Indonesia ke ${DESTINATIONS.map(d => d.name).join(', ')}"><path class="grat" d="${grat}"/>${land}${routes}<circle class="origin" cx="${ox}" cy="${oy}" r="7"/><text x="${ox + 10}" y="${oy + 22}">Indonesia</text></svg>
      <ul class="dest-list">${DESTINATIONS.map(d => `<li>${esc(d.name)}</li>`).join('')}</ul><p class="note">Peta skematik. Negara tujuan di atas adalah contoh, belum ditetapkan pemilik.</p></div>`;
  }

  function certBadges() {
    return `<div class="badges" data-stagger>${CERTS.map(c => `<div class="badge">${icon(c.icon)}<div><b>${esc(c.name)}<span class="tag-sample">contoh</span></b><small>${c.year ? 'Berlaku ' + esc(c.year) : 'Belum dikonfirmasi pemilik'}</small>${c.coa_url ? `<div><a class="btn sm ghost" href="${esc(c.coa_url)}" target="_blank" rel="noopener">Lihat COA</a></div>` : ''}</div></div>`).join('')}</div>`;
  }

  /* ───────── kalkulator estimasi: total = quantity × price_per_kg (NVLib.estimate) ───────── */
  function calculator(p, qty = 10, flat = false) {
    return `<div class="calc ${flat ? 'flat' : 'glass'}" data-calc data-price="${p.price_per_kg}">
      <label class="l" for="cq">Volume (kg)</label>
      <div class="calc-row"><input type="range" min="1" max="500" step="1" value="${Math.min(500, Math.max(1, qty))}" aria-label="Geser volume" data-calc-range>
      <input class="field" id="cq" type="number" min="1" step="0.01" inputmode="decimal" value="${qty}" data-calc-num></div>
      <div class="err" data-calc-err aria-live="polite"></div>
      <div>Total estimasi</div><output data-calc-out for="cq">${L.formatUSD(L.estimate(qty, p.price_per_kg))}</output>
      <p class="note">Estimasi indikatif, bukan penawaran resmi. Harga referensi ${L.formatUSD(p.price_per_kg)}/kg.</p></div>`;
  }
  function bindCalc(scope, onQty) {
    const c = scope.querySelector('[data-calc]'); if (!c) return null;
    const price = +c.dataset.price, rng = c.querySelector('[data-calc-range]'), num = c.querySelector('[data-calc-num]'), out = c.querySelector('[data-calc-out]'), err = c.querySelector('[data-calc-err]');
    let cur = L.estimate(+num.value || 0, price);
    const show = q => {
      const e = L.validateRfq({ company_name: 'xx', contact_name: 'xx', email: 'a@b.co', phone: '123456', country: 'xx', quantity_kg: q }).quantity_kg;
      err.textContent = e || '';
      num.setAttribute('aria-invalid', e ? 'true' : 'false');
      const next = e ? 0 : L.estimate(q, price);
      window.NVM.tween(out, cur, next, v => L.formatUSD(v));
      cur = next;
      onQty && onQty(q, !e);
    };
    rng.addEventListener('input', () => { num.value = rng.value; show(+rng.value); });
    num.addEventListener('input', () => { const q = num.value; if (q !== '' && +q >= 1 && +q <= 500) rng.value = Math.round(+q); show(q === '' ? NaN : +q); });
    return { set: q => { num.value = q; rng.value = Math.min(500, Math.max(1, Math.round(q))); show(q); } };
  }

  window.NVD = { esc, art, image, STORY_ART, vine, exportMap, certBadges, calculator, bindCalc, DESTINATIONS, CERTS };
})();
