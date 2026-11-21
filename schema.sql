-- Tropic Bean Co. v2: katalog vanili + RFQ (single seller)
-- Jalankan di Supabase → SQL Editor → New query → Run. Aman dijalankan ulang.

-- ───────── Admin ─────────
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table admins enable row level security;

create or replace function is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'admins' and policyname = 'admin read admins') then
    create policy "admin read admins" on admins for select using (user_id = auth.uid());
  end if;
end $$;

-- ───────── Produk (soft-delete) ─────────
create table if not exists vanilla_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  grade text not null,
  length_cm numeric not null default 0 check (length_cm >= 0),
  moisture_percentage numeric not null check (moisture_percentage >= 0 and moisture_percentage <= 100),
  vanillin_percentage numeric not null check (vanillin_percentage >= 0 and vanillin_percentage <= 100),
  price_per_kg numeric(12,2) not null check (price_per_kg > 0),
  stock_kg numeric(12,2) not null default 0 check (stock_kg >= 0),
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','OUT_OF_STOCK','ARCHIVED')),
  origin text,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists vanilla_products_slug_active on vanilla_products (slug) where deleted_at is null;
create index if not exists vanilla_products_deleted_at on vanilla_products (deleted_at);
create index if not exists vanilla_products_status on vanilla_products (status);

-- ───────── Inquiry / RFQ ─────────
create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_number text not null unique,
  product_id uuid not null references vanilla_products(id) on delete restrict on update cascade,
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  country text not null,
  quantity_kg numeric(12,2) not null check (quantity_kg > 0),
  price_snapshot_at_inquiry numeric(12,2) not null,
  notes text,
  status text not null default 'PENDING' check (status in ('PENDING','QUOTED','CONFIRMED','CANCELLED')),
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inquiries_product_id on inquiries (product_id);
create index if not exists inquiries_status on inquiries (status);
create index if not exists inquiries_email on inquiries (lower(email));

create table if not exists rfq_lookup_attempts (
  inquiry_number text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists rfq_lookup_attempts_idx on rfq_lookup_attempts (inquiry_number, attempted_at);

-- updated_at otomatis
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create or replace trigger vanilla_products_touch before update on vanilla_products for each row execute function touch_updated_at();
create or replace trigger inquiries_touch before update on inquiries for each row execute function touch_updated_at();

-- Transisi status RFQ: PENDING→QUOTED→CONFIRMED, atau CANCELLED dari PENDING/QUOTED/CONFIRMED
create or replace function inquiry_status_guard() returns trigger language plpgsql as $$
begin
  if new.status <> old.status and not (
    (old.status = 'PENDING'   and new.status in ('QUOTED','CANCELLED')) or
    (old.status = 'QUOTED'    and new.status in ('CONFIRMED','CANCELLED')) or
    (old.status = 'CONFIRMED' and new.status = 'CANCELLED')
  ) then
    raise exception 'Transisi status % → % tidak diizinkan', old.status, new.status using errcode = '23514';
  end if;
  return new;
end $$;
create or replace trigger inquiries_status_guard before update on inquiries for each row execute function inquiry_status_guard();

-- ───────── RLS ─────────
alter table vanilla_products   enable row level security;
alter table inquiries          enable row level security;
alter table rfq_lookup_attempts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'vanilla_products' and policyname = 'public read active products') then
    create policy "public read active products" on vanilla_products for select
      using ((deleted_at is null and status <> 'ARCHIVED') or is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'vanilla_products' and policyname = 'admin write products') then
    create policy "admin write products" on vanilla_products for all using (is_admin()) with check (is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'inquiries' and policyname = 'admin all inquiries') then
    create policy "admin all inquiries" on inquiries for all using (is_admin()) with check (is_admin());
  end if;
end $$;
-- Tidak ada policy untuk anon pada inquiries: pembeli hanya lewat fungsi di bawah.

-- ───────── RPC publik: buat RFQ ─────────
create or replace function create_inquiry(
  p_product_id uuid, p_company_name text, p_contact_name text, p_email text, p_phone text,
  p_country text, p_quantity_kg numeric, p_notes text default null,
  p_idempotency_key text default null, p_website text default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  prod vanilla_products%rowtype;
  ex inquiries%rowtype;
  errs jsonb := '{}'::jsonb;
  qty numeric;
  num text;
  tries int := 0;
begin
  if coalesce(p_website, '') <> '' then  -- honeypot terisi: bot
    return json_build_object('ok', false, 'code', 'REJECTED', 'message', 'Permintaan ditolak.');
  end if;

  if p_idempotency_key is not null then
    select * into ex from inquiries where idempotency_key = p_idempotency_key;
    if found then
      return json_build_object('ok', true, 'data', json_build_object('inquiry_number', ex.inquiry_number, 'status', ex.status,
        'total_estimate', round(ex.quantity_kg * ex.price_snapshot_at_inquiry, 2)));
    end if;
  end if;

  p_company_name := btrim(coalesce(p_company_name, ''));
  p_contact_name := btrim(coalesce(p_contact_name, ''));
  p_email        := lower(btrim(coalesce(p_email, '')));
  p_phone        := btrim(coalesce(p_phone, ''));
  p_country      := btrim(coalesce(p_country, ''));
  p_notes        := nullif(btrim(coalesce(p_notes, '')), '');

  if char_length(p_company_name) < 2 or char_length(p_company_name) > 120 then errs := errs || '{"company_name":"Isi nama perusahaan."}'; end if;
  if char_length(p_contact_name) < 2 or char_length(p_contact_name) > 120 then errs := errs || '{"contact_name":"Isi nama kontak."}'; end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(p_email) > 254 then errs := errs || '{"email":"Masukkan email yang valid."}'; end if;
  if p_phone !~ '^[+0-9 ()-]{6,30}$' then errs := errs || '{"phone":"Masukkan nomor kontak yang valid."}'; end if;
  if char_length(p_country) < 2 or char_length(p_country) > 80 then errs := errs || '{"country":"Isi negara tujuan."}'; end if;
  if p_quantity_kg is null or p_quantity_kg < 1 then errs := errs || '{"quantity_kg":"Kuantitas pemesanan minimal 1 kg."}';
  elsif round(p_quantity_kg, 2) <> p_quantity_kg then errs := errs || '{"quantity_kg":"Maksimal 2 angka desimal."}';
  elsif p_quantity_kg > 100000 then errs := errs || '{"quantity_kg":"Kuantitas terlalu besar. Hubungi kami."}'; end if;
  if p_notes is not null and (char_length(p_notes) > 1000 or p_notes ~ '[\x00-\x08\x0B\x0C\x0E-\x1F]') then
    errs := errs || '{"notes":"Catatan maksimal 1000 karakter tanpa karakter kontrol."}';
  end if;
  if errs <> '{}'::jsonb then
    return json_build_object('ok', false, 'code', 'VALIDATION_ERROR', 'message', 'Periksa kembali isian Anda.', 'errors', errs);
  end if;
  qty := p_quantity_kg;

  select * into prod from vanilla_products where id = p_product_id and deleted_at is null and status <> 'ARCHIVED';
  if not found then
    return json_build_object('ok', false, 'code', 'PRODUCT_UNAVAILABLE', 'message', 'Produk ini sudah tidak tersedia. Muat ulang katalog.');
  end if;

  loop
    num := 'RFQ-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYY') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into inquiries (inquiry_number, product_id, company_name, contact_name, email, phone, country, quantity_kg,
                             price_snapshot_at_inquiry, notes, idempotency_key)
      values (num, prod.id, p_company_name, p_contact_name, p_email, p_phone, p_country, qty, prod.price_per_kg, p_notes, p_idempotency_key);
      exit;
    exception when unique_violation then
      if p_idempotency_key is not null then
        select * into ex from inquiries where idempotency_key = p_idempotency_key;
        if found then
          return json_build_object('ok', true, 'data', json_build_object('inquiry_number', ex.inquiry_number, 'status', ex.status,
            'total_estimate', round(ex.quantity_kg * ex.price_snapshot_at_inquiry, 2)));
        end if;
      end if;
      tries := tries + 1;
      if tries > 5 then raise; end if;
    end;
  end loop;

  return json_build_object('ok', true, 'data', json_build_object('inquiry_number', num, 'status', 'PENDING',
    'total_estimate', round(qty * prod.price_per_kg, 2)));
end $$;

-- ───────── RPC publik: cek status RFQ (nomor + email) ─────────
create or replace function lookup_inquiry(p_inquiry_number text, p_email text)
returns json language plpgsql security definer set search_path = public as $$
declare
  num text := upper(btrim(coalesce(p_inquiry_number, '')));
  em  text := lower(btrim(coalesce(p_email, '')));
  r record;
  fails int;
  hit boolean;
begin
  select count(*) into fails from rfq_lookup_attempts where inquiry_number = num and attempted_at > now() - interval '15 minutes';
  if fails >= 5 then
    return json_build_object('ok', false, 'code', 'RATE_LIMITED', 'message', 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
  end if;

  select i.inquiry_number, i.status, p.name as product_name, i.quantity_kg, i.created_at, i.updated_at
    into r
    from inquiries i join vanilla_products p on p.id = i.product_id
   where i.inquiry_number = num and lower(i.email) = em;

  hit := found;
  perform pg_sleep(0.25);  -- waktu respons seragam (perform mereset FOUND, jadi disimpan dulu)
  if not hit then
    insert into rfq_lookup_attempts (inquiry_number) values (num);
    return json_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Nomor RFQ atau email tidak ditemukan.');
  end if;
  return json_build_object('ok', true, 'data', json_build_object('inquiry_number', r.inquiry_number, 'status', r.status,
    'product_name', r.product_name, 'quantity_kg', r.quantity_kg, 'created_at', r.created_at, 'updated_at', r.updated_at));
end $$;

revoke all on function create_inquiry(uuid, text, text, text, text, text, numeric, text, text, text) from public;
revoke all on function lookup_inquiry(text, text) from public;
grant execute on function create_inquiry(uuid, text, text, text, text, text, numeric, text, text, text) to anon, authenticated;
grant execute on function lookup_inquiry(text, text) to anon, authenticated;

-- ───────── Setelah membuat user admin di Authentication → Users ─────────
-- insert into admins (user_id) select id from auth.users where email = 'EMAIL_ADMIN';

-- ═════════ Admin v2 (aplikasi admin terpisah): buyer, riwayat harga, catatan, penawaran final, foto ═════════
-- Aman dijalankan ulang. Dipakai oleh repo nusa-vanilla-admin; situs publik tidak membaca tabel-tabel ini.

create table if not exists buyers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  company_name text not null,
  contact_name text not null,
  phone text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists buyers_email_key on buyers (lower(email));
create or replace trigger buyers_touch before update on buyers for each row execute function touch_updated_at();

alter table inquiries add column if not exists buyer_id uuid references buyers(id) on delete set null on update cascade;
alter table inquiries add column if not exists internal_notes text;
alter table inquiries add column if not exists quoted_price_per_kg numeric(12,2) check (quoted_price_per_kg is null or quoted_price_per_kg > 0);
alter table inquiries add column if not exists quoted_quantity_kg numeric(12,2) check (quoted_quantity_kg is null or quoted_quantity_kg > 0);
create index if not exists inquiries_buyer_id on inquiries (buyer_id);

-- Buyer terbentuk otomatis dari RFQ (satu buyer per email). Data kontak buyer lama tidak ditimpa RFQ baru.
create or replace function link_inquiry_buyer() returns trigger language plpgsql security definer set search_path = public as $$
declare bid uuid;
begin
  insert into buyers (email, company_name, contact_name, phone, country)
  values (lower(new.email), new.company_name, new.contact_name, new.phone, new.country)
  on conflict (lower(email)) do update set email = buyers.email
  returning id into bid;
  new.buyer_id := bid;
  return new;
end $$;
create or replace trigger inquiries_link_buyer before insert on inquiries for each row execute function link_inquiry_buyer();

-- Isi buyer dari RFQ yang sudah ada
insert into buyers (email, company_name, contact_name, phone, country)
select distinct on (lower(email)) lower(email), company_name, contact_name, phone, country
  from inquiries order by lower(email), created_at desc
on conflict (lower(email)) do nothing;
update inquiries i set buyer_id = b.id from buyers b where lower(b.email) = lower(i.email) and i.buyer_id is null;

-- Riwayat harga per produk (diisi otomatis)
create table if not exists product_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references vanilla_products(id) on delete cascade,
  old_price numeric(12,2),
  new_price numeric(12,2) not null,
  changed_at timestamptz not null default now()
);
create index if not exists price_history_product on product_price_history (product_id, changed_at desc);

create or replace function log_price_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into product_price_history (product_id, old_price, new_price) values (new.id, null, new.price_per_kg);
  elsif new.price_per_kg is distinct from old.price_per_kg then
    insert into product_price_history (product_id, old_price, new_price) values (new.id, old.price_per_kg, new.price_per_kg);
  end if;
  return new;
end $$;
create or replace trigger vanilla_products_price_log after insert or update of price_per_kg on vanilla_products for each row execute function log_price_change();
insert into product_price_history (product_id, old_price, new_price)
select p.id, null, p.price_per_kg from vanilla_products p where not exists (select 1 from product_price_history h where h.product_id = p.id);

alter table buyers enable row level security;
alter table product_price_history enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'buyers' and policyname = 'admin all buyers') then
    create policy "admin all buyers" on buyers for all using (is_admin()) with check (is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'product_price_history' and policyname = 'admin read price history') then
    create policy "admin read price history" on product_price_history for select using (is_admin());
  end if;
end $$;

-- Foto produk (Storage): baca publik, tulis hanya admin
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'product images read') then
    create policy "product images read" on storage.objects for select using (bucket_id = 'product-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'product images admin write') then
    create policy "product images admin write" on storage.objects for all using (bucket_id = 'product-images' and is_admin()) with check (bucket_id = 'product-images' and is_admin());
  end if;
end $$;

-- Terjemahan katalog (i18n). Teks sumber tetap di vanilla_products (id); baris di sini opsional per bahasa.
-- Tampilan: bahasa aktif, lalu en, lalu teks sumber. Kolom kosong (null) = pakai cadangan.
create table if not exists product_translations (
  product_id uuid not null references vanilla_products(id) on delete cascade,
  lang text not null check (lang in ('id', 'en', 'ja', 'ko', 'fr', 'es')),
  name text,
  description text,
  grade text,
  primary key (product_id, lang)
);
alter table product_translations enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'product_translations' and policyname = 'public read translations') then
    create policy "public read translations" on product_translations for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'product_translations' and policyname = 'admin write translations') then
    create policy "admin write translations" on product_translations for all using (is_admin()) with check (is_admin());
  end if;
end $$;

-- Terjemahan Inggris untuk produk awal (aman diulang; tidak menimpa suntingan yang sudah ada)
insert into product_translations (product_id, lang, description, grade)
select p.id, 'en', v.d, v.g from vanilla_products p join (values
  ('planifolia-gourmet', 'Plump, oily, dark brown beans with a sweet, creamy aroma. For pastry, ice cream, and premium retail products.', null),
  ('planifolia-extraction', 'Drier beans with a high vanillin yield. Suited to extract production and industrial flavorings.', null),
  ('tahitensis-gourmet', 'Floral and cherry notes from the highlands of Papua. Sought after by chefs and perfumers.', null),
  ('tahitensis-extraction', 'Tahitensis beans for extraction with a soft floral character.', null),
  ('planifolia-powder', 'Whole beans ground without additives. For bakery, beverages, and cosmetics.', 'Powder, food grade'),
  ('cuts-and-splits', 'Cut and split beans for economical extraction. Currently out of stock; contact us for the next harvest.', null)
) as v(slug, d, g) on v.slug = p.slug
on conflict (product_id, lang) do nothing;

-- Terjemahan fr/es/ja/ko untuk produk awal. ja dan ko adalah draf AI: tinjau penutur asli sebelum dirilis (PRD Bagian 2).
insert into product_translations (product_id, lang, description, grade)
select p.id, v.lang, v.d, v.g from vanilla_products p join (values
  ('planifolia-gourmet', 'fr', 'Gousses charnues et huileuses, brun foncé, à l''arôme doux et crémeux. Pour la pâtisserie, les glaces et les produits de détail haut de gamme.', null),
  ('planifolia-gourmet', 'es', 'Vainas carnosas y aceitosas, de color marrón oscuro, con un aroma dulce y cremoso. Para pastelería, helados y productos minoristas premium.', null),
  ('planifolia-gourmet', 'ja', 'ふっくらと油分のある濃い茶色のビーンズで、甘くクリーミーな香りです。製菓、アイスクリーム、プレミアム小売商品に適しています。', null),
  ('planifolia-gourmet', 'ko', '통통하고 기름기가 있는 짙은 갈색 빈으로, 달콤하고 크리미한 향이 납니다. 제과, 아이스크림, 프리미엄 소매 제품에 적합합니다.', null),
  ('planifolia-extraction', 'fr', 'Gousses plus sèches à fort rendement en vanilline. Adaptées à la production d''extraits et aux arômes industriels.', null),
  ('planifolia-extraction', 'es', 'Vainas más secas con alto rendimiento de vainillina. Adecuadas para la producción de extractos y aromas industriales.', null),
  ('planifolia-extraction', 'ja', '水分が少なく、バニリンの収率が高いビーンズです。エキス製造や工業用フレーバーに適しています。', null),
  ('planifolia-extraction', 'ko', '수분이 적고 바닐린 수율이 높은 빈입니다. 추출물 제조와 산업용 향료에 적합합니다.', null),
  ('tahitensis-gourmet', 'fr', 'Notes florales et de cerise, issues des hautes terres de Papouasie. Recherchées par les chefs et les parfumeurs.', null),
  ('tahitensis-gourmet', 'es', 'Notas florales y de cereza procedentes de las tierras altas de Papúa. Muy buscadas por chefs y perfumistas.', null),
  ('tahitensis-gourmet', 'ja', 'パプアの高地で育った、花とチェリーを思わせる香りです。シェフや調香師に求められています。', null),
  ('tahitensis-gourmet', 'ko', '파푸아 고원 지대에서 자란 꽃향기와 체리 향이 특징입니다. 셰프와 조향사들이 찾는 제품입니다.', null),
  ('tahitensis-extraction', 'fr', 'Gousses de Tahitensis destinées à l''extraction, au caractère floral délicat.', null),
  ('tahitensis-extraction', 'es', 'Vainas Tahitensis para extracción, con un carácter floral suave.', null),
  ('tahitensis-extraction', 'ja', 'エキス抽出用のタヒテンシス・ビーンズで、やわらかなフローラルの特徴があります。', null),
  ('tahitensis-extraction', 'ko', '추출용 타히텐시스 빈으로, 부드러운 플로럴 특성을 지니고 있습니다.', null),
  ('planifolia-powder', 'fr', 'Gousses entières moulues sans additifs. Pour la boulangerie, les boissons et les cosmétiques.', 'Poudre, qualité alimentaire'),
  ('planifolia-powder', 'es', 'Vainas enteras molidas sin aditivos. Para panadería, bebidas y cosmética.', 'Polvo, grado alimentario'),
  ('planifolia-powder', 'ja', 'ビーンズを丸ごと、添加物なしで粉砕しました。ベーカリー、飲料、化粧品向けです。', 'パウダー、食品グレード'),
  ('planifolia-powder', 'ko', '첨가물 없이 통째로 분쇄한 빈입니다. 제빵, 음료, 화장품에 사용됩니다.', '분말, 식품 등급'),
  ('cuts-and-splits', 'fr', 'Gousses coupées et fendues pour une extraction économique. Actuellement en rupture de stock ; contactez-nous pour la prochaine récolte.', null),
  ('cuts-and-splits', 'es', 'Vainas cortadas y abiertas para una extracción económica. Actualmente sin stock; contáctenos para la próxima cosecha.', null),
  ('cuts-and-splits', 'ja', '経済的なエキス抽出に適した、カットおよびスプリットのビーンズです。現在在庫切れです。次回の収穫についてはお問い合わせください。', null),
  ('cuts-and-splits', 'ko', '경제적인 추출을 위한 절단 및 분할 빈입니다. 현재 품절이며, 다음 수확분은 문의해 주십시오.', null)
) as v(slug, lang, d, g) on v.slug = p.slug
on conflict (product_id, lang) do nothing;
