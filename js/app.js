/* Router hash + boot. Rute publik: / , /produk/:slug , /rfq/status. Portal admin ada di repo terpisah (nusa-vanilla-admin). */
(function () {
  const app = document.getElementById('app');
  const { NVPublic: P, NVM: M } = window;

  function route() {
    M.cleanup();
    document.querySelectorAll('.gcursor').forEach(n => n.remove());
    document.body.style.overflow = '';
    const full = location.hash.replace(/^#/, '') || '/';
    const path = full.split('?')[0].replace(/\/+$/, '') || '/';
    let m;
    if (path === '/') P.landing(app);
    else if ((m = path.match(/^\/produk\/([a-z0-9-]+)$/))) P.productPage(app, m[1]);
    else if (path === '/rfq/status') P.statusPage(app);
    else P.notFound(app);
    if (!/^\/$/.test(path)) window.scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  addEventListener('nv-lang', route);
  window.NVI18N.init().then(route);
})();
