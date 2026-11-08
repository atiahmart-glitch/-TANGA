create extension if not exists pgcrypto;

create table if not exists public.road_reports (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('Hazard / object','Roadworks','Crash / breakdown','Signal / camera','Night danger','Trotro / bus alert')),
  details text not null default '' check (char_length(details) <= 1000),
  location_label text not null check (char_length(location_label) between 1 and 180),
  latitude double precision not null check (latitude between 4.5 and 11.5),
  longitude double precision not null check (longitude between -3.5 and 1.5),
  direction text check (direction is null or char_length(direction) <= 80),
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists road_reports_public_idx on public.road_reports (status, expires_at, created_at desc);

create table if not exists public.fuel_price_reports (
  id uuid primary key default gen_random_uuid(),
  station_name text not null default '' check (char_length(station_name) <= 120),
  product text not null check (product in ('petrol','diesel','lpg')),
  price_ghs_per_litre numeric(8,2) not null check (price_ghs_per_litre > 0 and price_ghs_per_litre <= 1000),
  location_label text not null check (char_length(location_label) between 1 and 180),
  latitude double precision not null check (latitude between 4.5 and 11.5),
  longitude double precision not null check (longitude between -3.5 and 1.5),
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists fuel_price_public_idx on public.fuel_price_reports (status, expires_at, created_at desc);

-- Confidential police-conduct reports are deliberately not part of the public API.
-- Do not create a public select policy for such records. Add a separately moderated,
-- access-controlled workflow before collecting those complaints.

alter table public.road_reports enable row level security;
alter table public.fuel_price_reports enable row level security;
revoke all on public.road_reports from anon, authenticated;
revoke all on public.fuel_price_reports from anon, authenticated;
grant select on public.road_reports to anon, authenticated;
grant select on public.fuel_price_reports to anon, authenticated;

create policy "Anyone can read current verified road reports"
on public.road_reports for select to anon, authenticated
using (status = 'verified' and expires_at > now());

create policy "Anyone can read current verified fuel prices"
on public.fuel_price_reports for select to anon, authenticated
using (status = 'verified' and expires_at > now());
