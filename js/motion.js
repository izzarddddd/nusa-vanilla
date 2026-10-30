/* Lapisan gerak storefront publik. Hanya transform/opacity (+ blur pada TextReveal), sekali jalan, tanpa loop
   (kecuali video hero). Portal admin tidak memanggil berkas ini. */
(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const small = () => matchMedia('(max-width: 767px)').matches;
  const root = document.documentElement;
  root.classList.add(reduced || !hasIO ? 'no-motion' : 'js-motion');

  let cleanups = [];
  const onCleanup = fn => cleanups.push(fn);
  const cleanup = () => { cleanups.forEach(f => { try { f(); } catch (_) {} }); cleanups = []; };

  const watch = (els, cb, opts) => {
    if (!els.length) return;
    if (reduced || !hasIO) { els.forEach(e => cb(e, true)); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); cb(en.target, false); } }), opts || { threshold: 0.2 });
    els.forEach(e => io.observe(e));
    onCleanup(() => io.disconnect());
  };

  /* Reveal + Stagger (maks 8 anak berurutan, jeda 70ms) */
  function reveal(scope) {
    const groups = [...scope.querySelectorAll('[data-stagger]')]; if (scope.matches && scope.matches('[data-stagger]')) groups.push(scope);
    groups.forEach(g => [...g.children].forEach((c, i) => { c.dataset.reveal = ''; c.style.setProperty('--d', Math.min(i, 7) * 70 + 'ms'); }));
    watch([...scope.querySelectorAll('[data-reveal]')], e => e.classList.add('in'));
  }

  /* TextReveal: kata demi kata, jeda 85ms, maks 12 kata. Teks utuh tetap ada di HTML sumber. */
  function textReveal(scope) {
    const els = [...scope.querySelectorAll('.tr')];
    if (reduced) return;
    els.forEach(el => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach((w, i) => {
        const s = document.createElement('span');
        s.className = 'tr-word';
        s.style.setProperty('--word-delay', Math.min(i, 11) * 85 + 'ms');
        s.textContent = w + (i < words.length - 1 ? ' ' : '');
        el.appendChild(s);
      });
    });
    watch(els, e => e.classList.add('in'));
  }

  /* Typewriter: sekali jalan, 35ms/huruf, kursor hilang setelah selesai. Teks utuh di aria-label. */
  function typewriter(scope) {
    scope.querySelectorAll('[data-typewriter]').forEach(el => {
      if (reduced) return;
      const text = el.textContent.trim().slice(0, 60);
      el.setAttribute('aria-label', text);
      el.textContent = '';
      const chars = [...text].map(c => { const s = document.createElement('span'); s.className = 'tw-ch'; s.setAttribute('aria-hidden', 'true'); s.textContent = c; el.appendChild(s); return s; });
      const cur = document.createElement('span'); cur.className = 'tw-cursor'; cur.setAttribute('aria-hidden', 'true'); cur.textContent = '|'; el.appendChild(cur);
      let i = 0, t;
      const step = () => { if (i < chars.length) { chars[i++].classList.add('on'); t = setTimeout(step, 35); } else setTimeout(() => cur.remove(), 400); };
      t = setTimeout(step, 600);
      onCleanup(() => clearTimeout(t));
    });
  }

  /* CountUp: nilai akhir sudah ada di HTML & aria-label */
  function countUp(scope) {
    watch([...scope.querySelectorAll('[data-count]')], el => {
      if (reduced) return;
      const to = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0), suf = el.dataset.suffix || '';
      const t0 = performance.now(), dur = 1200;
      const tick = now => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = (to * e).toFixed(dec) + suf;
        if (k < 1) requestAnimationFrame(tick); else el.textContent = to.toFixed(dec) + suf;
      };
      requestAnimationFrame(tick);
    });
  }

  const simpleIn = (scope, sel, immediateWhen) => watch([...scope.querySelectorAll(sel)], e => e.classList.add('in'), { threshold: 0.25 });

  /* Cerita scroll "Dari kebun ke kontainer": sticky 4 tahap di desktop, daftar di < 768px / reduced motion */
  function story(scope) {
    const sec = scope.querySelector('.story');
    if (!sec || reduced) return;
    const stages = [...sec.querySelectorAll('.stage')], arts = [...sec.querySelectorAll('.story-art > svg')], line = sec.querySelector('.story-line');
    let raf = 0;
    const update = () => {
      raf = 0;
      if (small()) return;
      const r = sec.getBoundingClientRect(), total = r.height - innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / total));
      const idx = Math.min(stages.length - 1, Math.floor(p * stages.length));
      line.style.setProperty('--p', p.toFixed(3));
      stages.forEach((s, i) => s.classList.toggle('on', i === idx));
      arts.forEach((a, i) => a.classList.toggle('on', i === idx));
    };
    const req = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', req);
    onCleanup(() => { removeEventListener('scroll', req); removeEventListener('resize', req); cancelAnimationFrame(raf); });
    update();
  }

  /* Video latar hero: poster = LCP, video dimuat setelah halaman idle, crossfade dua elemen, hemat data */
  function hero(scope, url) {
    const box = scope.querySelector('.hero-media');
    if (!box || reduced) return;
    const c = navigator.connection;
    if (c && (c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || ''))) return;
    const poster = box.querySelector('.poster'), shade = box.querySelector('.hero-shade');
    let a, b, active, idle = false, raf = 0, swapping = false, dead = false, visible = true;
    const mk = () => { const v = document.createElement('video'); v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto'; v.tabIndex = -1; v.setAttribute('aria-hidden', 'true'); v.src = url; box.insertBefore(v, shade); return v; };
    const fail = () => { dead = true; cancelAnimationFrame(raf); [a, b].forEach(v => v && v.remove()); poster && poster.classList.remove('hide'); };
    const loop = () => {
      if (dead) return;
      const d = active.duration;
      if (!swapping && d > 2 && active.currentTime >= d - 0.8) swap();
      raf = requestAnimationFrame(loop);
    };
    const swap = () => {
      swapping = true;
      const next = active === a ? b : a, prev = active;
      next.currentTime = 0;
      next.play().then(() => {
        next.classList.add('on'); prev.classList.remove('on'); active = next;
        setTimeout(() => { prev.pause(); prev.currentTime = 0; swapping = false; }, 850);
      }).catch(() => { prev.loop = true; swapping = false; });
    };
    const start = () => {
      if (dead) return;
      a = mk(); b = mk(); active = a;
      a.addEventListener('error', fail, { once: true });
      a.addEventListener('loadedmetadata', () => { if (a.duration <= 2) { a.loop = true; } });
      a.addEventListener('canplay', () => {
        a.play().then(() => { a.classList.add('on'); poster && poster.classList.add('hide'); if (a.duration > 2) raf = requestAnimationFrame(loop); }).catch(fail);
      }, { once: true });
    };
    const pause = () => { cancelAnimationFrame(raf); active && active.pause(); };
    const resume = () => { if (active && !dead && visible && !document.hidden) { active.play().catch(() => {}); if (active.duration > 2) { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); } } };
    const vis = () => (document.hidden ? pause() : resume());
    document.addEventListener('visibilitychange', vis);
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? resume() : pause(); });
    io.observe(box);
    const go = () => { idle = true; start(); };
    const t = 'requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 800);
    onCleanup(() => { dead = true; cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', vis); if ('cancelIdleCallback' in window) cancelIdleCallback(t); else clearTimeout(t); });
  }

  /* Foto produk bergerak di dalam kartu: maks 4°, geser <= 6px, panel kaca tetap diam. Hanya mouse. */
  function tilt(scope) {
    if (reduced || !fine) return;
    scope.querySelectorAll('.card').forEach(card => {
      const art = card.querySelector('.tilt-art'), ph = card.querySelector('.card-photo');
      if (!art) return;
      ph.addEventListener('pointermove', e => {
        const r = ph.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        art.style.transform = `perspective(800px) scale(1.05) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translate(${(x * 12).toFixed(1)}px, ${(y * 12).toFixed(1)}px)`;
      });
      ph.addEventListener('pointerleave', () => { art.style.transform = ''; });
    });
  }

  /* Kursor "Lihat": hanya di galeri, hanya desktop */
  function galleryCursor(scope) {
    const g = scope.querySelector('.gallery');
    if (!g || reduced || !fine) return;
    const cur = document.createElement('div'); cur.className = 'gcursor'; cur.textContent = 'Lihat'; cur.setAttribute('aria-hidden', 'true'); document.body.appendChild(cur);
    const mv = e => { cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; };
    g.addEventListener('pointerenter', () => cur.classList.add('on'));
    g.addEventListener('pointerleave', () => cur.classList.remove('on'));
    g.addEventListener('pointermove', mv);
    onCleanup(() => cur.remove());
  }

  function header() {
    const h = document.querySelector('.hdr');
    if (!h) return;
    const f = () => h.classList.toggle('is-solid', scrollY > 40);
    addEventListener('scroll', f, { passive: true }); f();
    onCleanup(() => removeEventListener('scroll', f));
  }

  /* Angka yang berubah halus (kalkulator) */
  function tween(el, from, to, fmt, ms = 300) {
    if (reduced) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    cancelAnimationFrame(el._raf);
    const f = now => { const k = Math.min(1, (now - t0) / ms); el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) el._raf = requestAnimationFrame(f); };
    el._raf = requestAnimationFrame(f);
  }

  /* Pindai halaman yang baru dirender */
  function scan(scope, opts = {}) {
    if (!opts.keep) { cleanup(); header(); }
    reveal(scope); textReveal(scope); typewriter(scope); countUp(scope);
    watch([...scope.querySelectorAll('.spec-bar')], e => e.classList.add('in'));
    simpleIn(scope, '.vine');
    const map = scope.querySelector('.map');
    if (map) { if (small()) { map.classList.add('in', 'static'); } else watch([map], e => e.classList.add('in'), { threshold: 0.3 }); }
    story(scope); tilt(scope); galleryCursor(scope);
    if (opts.heroUrl) hero(scope, opts.heroUrl);
  }

  window.NVM = { scan, cleanup, tween, reduced };
})();
