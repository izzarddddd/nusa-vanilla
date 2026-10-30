/* Akses data Supabase. Aturan bisnis RFQ (validasi, nomor, snapshot harga) ada di fungsi database; lihat schema.sql. */
(function () {
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const PUB_COLS = 'id,name,slug,grade,length_cm,moisture_percentage,vanillin_percentage,price_per_kg,stock_kg,status,origin,description,image_url';
  const num = r => ({ ...r, length_cm: +r.length_cm, moisture_percentage: +r.moisture_percentage, vanillin_percentage: +r.vanillin_percentage, price_per_kg: +r.price_per_kg, stock_kg: +r.stock_kg });
  const fail = e => { const err = new Error(e.message || 'Terjadi kesalahan'); err.code = e.code; throw err; };

  const D = {
    sb,
    async products() {
      const { data, error } = await sb.from('vanilla_products').select(PUB_COLS).is('deleted_at', null).neq('status', 'ARCHIVED').order('created_at');
      if (error) fail(error);
      return data.map(num).sort((p, q) => (p.status === 'OUT_OF_STOCK') - (q.status === 'OUT_OF_STOCK') || q.price_per_kg - p.price_per_kg);
    },
    async product(slug) {
      const { data, error } = await sb.from('vanilla_products').select(PUB_COLS).eq('slug', slug).is('deleted_at', null).neq('status', 'ARCHIVED').maybeSingle();
      if (error) fail(error);
      return data ? num(data) : null;
    },
    async createInquiry(p, key) {
      const { data, error } = await sb.rpc('create_inquiry', {
        p_product_id: p.product_id, p_company_name: p.company_name, p_contact_name: p.contact_name, p_email: p.email, p_phone: p.phone,
        p_country: p.country, p_quantity_kg: p.quantity_kg, p_notes: p.notes || null, p_idempotency_key: key, p_website: p.website || ''
      });
      if (error) fail(error);
      return data;
    },
    async lookup(number, email) {
      const { data, error } = await sb.rpc('lookup_inquiry', { p_inquiry_number: number, p_email: email });
      if (error) fail(error);
      return data;
    },

    /* ───────── admin ───────── */
    async session() { const { data } = await sb.auth.getSession(); return data.session; },
    async isAdmin() {
      const s = await D.session(); if (!s) return false;
      const { data } = await sb.from('admins').select('user_id').eq('user_id', s.user.id).maybeSingle();
      return !!data;
    },
    async login(email, password) { const { error } = await sb.auth.signInWithPassword({ email, password }); return !error; },
    logout() { return sb.auth.signOut(); },
    async adminProducts() {
      const { data, error } = await sb.from('vanilla_products').select('*').is('deleted_at', null).order('created_at');
      if (error) fail(error);
      return data.map(num);
    },
    async saveProduct(row) {
      const { id, ...rest } = row;
      const q = id ? sb.from('vanilla_products').update(rest).eq('id', id) : sb.from('vanilla_products').insert(rest);
      const { error } = await q;
      if (error) { if (error.code === '23505') { const e = new Error('Slug sudah dipakai produk lain. Ubah nama produk.'); e.code = 'DUPLICATE'; throw e; } fail(error); }
    },
    async softDeleteProduct(id) { const { error } = await sb.from('vanilla_products').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) fail(error); },
    async pendingCount(productId) {
      const { count, error } = await sb.from('inquiries').select('id', { count: 'exact', head: true }).eq('product_id', productId).eq('status', 'PENDING');
      if (error) fail(error); return count || 0;
    },
    async inquiries({ status = '', page = 1, limit = 20 } = {}) {
      let q = sb.from('inquiries').select('*, vanilla_products(name)', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
      if (status) q = q.eq('status', status);
      const { data, error, count } = await q;
      if (error) fail(error);
      return { items: data, total: count || 0, page, limit, totalPages: Math.max(1, Math.ceil((count || 0) / limit)) };
    },
    async setInquiryStatus(id, status) { const { error } = await sb.from('inquiries').update({ status }).eq('id', id); if (error) fail(error); },
    async counts() {
      const c = s => sb.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', s).then(r => r.count || 0);
      const [PENDING, QUOTED, CONFIRMED, CANCELLED] = await Promise.all(['PENDING', 'QUOTED', 'CONFIRMED', 'CANCELLED'].map(c));
      return { PENDING, QUOTED, CONFIRMED, CANCELLED };
    }
  };
  window.NVData = D;
})();
