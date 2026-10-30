/* Router hash + boot. Rute publik: / , /produk/:slug , /rfq/status. Admin: /admin/... */
(function () {
  const app = document.getElementById('app');
  const { NVPublic: P, NVAdmin: A, NVM: M } = window;

  function route() {
    M.cleanup();
    document.querySelectorAll('.gcursor').forEach(n => n.remove());
    document.body.style.overflow = '';
    const full = location.hash.replace(/^#/, '') || '/';
    const path = full.split('?')[0].replace(/\/+$/, '') || '/';
    const isAdmin = path === '/admin' || path.startsWith('/admin/');
    document.body.classList.toggle('is-admin', isAdmin);
    document.documentElement.classList.toggle('admin-mode', isAdmin);
    let m;
    if (path === '/') P.landing(app);
    else if ((m = path.match(/^\/produk\/([a-z0-9-]+)$/))) P.productPage(app, m[1]);
    else if (path === '/rfq/status') P.statusPage(app);
    else if (path === '/admin/login') A.login(app);
    else if (path === '/admin') A.dashboard(app);
    else if (path === '/admin/products') A.productsPage(app);
    else if (path === '/admin/inquiries') A.inquiriesPage(app);
    else P.notFound(app);
    if (!/^\/$/.test(path)) window.scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  route();
})();
