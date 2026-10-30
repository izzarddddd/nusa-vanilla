-- Single seller: satu toko, tanpa tabel penjual.
-- Jalankan di Supabase → SQL Editor → New query → Run

create table if not exists products (
  id text primary key,
  name text not null,
  category text,
  species text,
  grade text,
  length text,
  moisture text,
  vanillin text,
  price numeric not null default 0,
  moq numeric not null default 1,
  stock numeric not null default 0,
  origin text,
  hue int default 28,
  image text,
  status text not null default 'draft' check (status in ('draft','published')),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  status text not null default 'New' check (status in ('New','Quoted','Paid','Shipped','Completed','Cancelled')),
  incoterm text,
  items jsonb not null,
  total numeric not null default 0,
  buyer jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  idr_rate numeric not null default 16000,
  email text,
  whatsapp text
);
insert into settings (id, email, whatsapp) values (1, 'export@nusavanilla.example', '+62 812 0000 0000') on conflict do nothing;

create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

alter table products enable row level security;
alter table orders   enable row level security;
alter table settings enable row level security;
alter table admins   enable row level security;

-- Publik: hanya baca produk published & pengaturan kontak
create policy "public read products" on products for select using (status = 'published' or is_admin());
create policy "public read settings" on settings for select using (true);

-- Pembeli (anon) boleh membuat order, tapi tidak bisa membaca/mengubahnya
create policy "anyone can create order" on orders for insert
  with check (status = 'New' and jsonb_typeof(items) = 'array');

-- Admin: akses penuh
create policy "admin all products" on products for all using (is_admin()) with check (is_admin());
create policy "admin all orders"   on orders   for all using (is_admin()) with check (is_admin());
create policy "admin all settings" on settings for all using (is_admin()) with check (is_admin());
create policy "admin read admins"  on admins   for select using (user_id = auth.uid());

-- SETELAH membuat user admin di Authentication → Users, jalankan (ganti emailnya):
-- insert into admins (user_id) select id from auth.users where email = 'izzarsohib@gmail.com';

-- Migrasi dari versi multi-seller (jika sebelumnya sudah dibuat):
-- alter table products drop column if exists seller_id;
-- alter table products add column if not exists origin text;
-- drop table if exists sellers cascade;
