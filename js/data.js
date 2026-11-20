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
    }
  };
  window.NVData = D;
})();
