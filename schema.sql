-- Nusa Vanilla v2: katalog vanili + RFQ (single seller)
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
