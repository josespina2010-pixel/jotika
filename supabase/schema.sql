-- =============================================================================
-- Sonora Hub — Esquema PostgreSQL para Supabase
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase.
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. Tabla de locales (tiendas de instrumentos, escuelas y estudios)
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('tienda', 'escuela', 'estudio')),
  address text not null,
  neighborhood text not null default '',
  contact_phone text not null,
  contact_email text not null default '',
  hours text not null default 'Lun–Sáb 10:00–19:00',
  latitude double precision not null,
  longitude double precision not null,
  description text not null default '',
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Tabla de catálogo (instrumentos, clases y servicios con precios)
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  item_type text not null check (item_type in ('instrumento', 'clase', 'servicio')),
  category text not null,
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  currency text not null default 'USD',
  price_unit text not null default 'unidad',
  available boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Índices para búsqueda y filtrado eficiente
create index if not exists idx_venues_type on public.venues(type);
create index if not exists idx_catalog_items_venue_id on public.catalog_items(venue_id);
create index if not exists idx_catalog_items_item_type on public.catalog_items(item_type);
create index if not exists idx_catalog_items_category on public.catalog_items(category);

-- 4. Trigger para actualizar updated_at en venues
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_venues_updated_at on public.venues;
create trigger trg_venues_updated_at
before update on public.venues
for each row execute function public.set_updated_at();

-- 5. Políticas de Row Level Security (RLS)
alter table public.venues enable row level security;
alter table public.catalog_items enable row level security;

drop policy if exists "Lectura pública de locales" on public.venues;
create policy "Lectura pública de locales"
  on public.venues for select
  using (true);

drop policy if exists "Lectura pública de catálogo" on public.catalog_items;
create policy "Lectura pública de catálogo"
  on public.catalog_items for select
  using (true);

-- Nota: Las escrituras (INSERT/UPDATE/DELETE) se ejecutan desde el servidor Express
-- utilizando SUPABASE_SERVICE_ROLE_KEY, la cual omite RLS de forma segura en backend.
