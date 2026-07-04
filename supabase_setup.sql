-- ============================================
-- MEPROMAS CLOUD — Supabase Datenbank Setup
-- Ausführen in: Supabase → SQL Editor → Run
-- ============================================

-- 1. Profil-Tabelle (erweitert auth.users)
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text,
  firma       text,
  rolle       text default 'techniker',
  sprache     text default 'de',
  created_at  timestamptz default now()
);

-- 2. Anlagen-Tabelle
create table if not exists public.anlagen (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  name        text not null,
  anlagen_id  text,
  standort    text,
  norm        text default 'vde_0105_100',
  intervall   text default '12',
  art         text default 'anlage',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 3. Protokoll-Tabelle
create table if not exists public.protokolle (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  anlage_id   uuid references public.anlagen on delete set null,
  kind        text,
  datum       date,
  pruefer     text,
  frist       date,
  intervall   text,
  ergebnis    text default 'ok',
  bemerkung   text,
  daten_json  jsonb default '{}',
  created_at  timestamptz default now()
);

-- 4. Row Level Security aktivieren
alter table public.profiles   enable row level security;
alter table public.anlagen    enable row level security;
alter table public.protokolle enable row level security;

-- 5. RLS Policies
create policy "Eigenes Profil lesen"   on public.profiles   for select using (auth.uid() = id);
create policy "Eigenes Profil ändern"  on public.profiles   for update using (auth.uid() = id);
create policy "Eigenes Profil anlegen" on public.profiles   for insert with check (auth.uid() = id);

create policy "Eigene Anlagen lesen"   on public.anlagen    for select using (auth.uid() = user_id);
create policy "Eigene Anlagen anlegen" on public.anlagen    for insert with check (auth.uid() = user_id);
create policy "Eigene Anlagen ändern"  on public.anlagen    for update using (auth.uid() = user_id);
create policy "Eigene Anlagen löschen" on public.anlagen    for delete using (auth.uid() = user_id);

create policy "Eigene Protokolle lesen"   on public.protokolle for select using (auth.uid() = user_id);
create policy "Eigene Protokolle anlegen" on public.protokolle for insert with check (auth.uid() = user_id);
create policy "Eigene Protokolle ändern"  on public.protokolle for update using (auth.uid() = user_id);
create policy "Eigene Protokolle löschen" on public.protokolle for delete using (auth.uid() = user_id);

-- ============================================
-- FERTIG — Alle Tabellen und Policies angelegt
-- ============================================
