-- ============================================
-- MEPROMAS CLOUD — Phase C5 Migration
-- Sicherheit, normalisiertes Datenmodell, Audit-Trail, Mail-Log
-- Ausführen NACH C1–C4 in: Supabase → SQL Editor → Run
-- ============================================

-- --------------------------------------------
-- 1. SICHERHEIT: Rollen-Eskalation verhindern
--    Nutzer dürfen ihr Profil ändern, aber NIEMALS die eigene Rolle.
--    Rollenänderung nur durch Service-Role (Admin-Backend / SQL-Editor).
-- --------------------------------------------
create or replace function public.schuetze_rolle()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Service-Role darf alles; normale Clients (auth.uid() gesetzt) nicht
  if auth.uid() is not null and new.rolle is distinct from old.rolle then
    raise exception 'Rollenänderung nur durch Administrator möglich';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_schuetze_rolle on public.profiles;
create trigger trg_schuetze_rolle
  before update on public.profiles
  for each row execute function public.schuetze_rolle();

-- --------------------------------------------
-- 2. E-Mail in profiles spiegeln (behebt N+1 in der Edge Function:
--    kein auth.admin.getUserById pro Nutzer mehr nötig)
-- --------------------------------------------
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_email on auth.users;
create trigger trg_sync_profile_email
  after insert or update of email on auth.users
  for each row execute function public.sync_profile_email();

-- --------------------------------------------
-- 3. NORMALISIERTES DATENMODELL: messwerte
--    Ersetzt langfristig daten_json — Basis für Trend-Analyse / ML.
-- --------------------------------------------
create table if not exists public.messwerte (
  id            uuid default gen_random_uuid() primary key,
  protokoll_id  uuid references public.protokolle on delete cascade not null,
  user_id       uuid references auth.users on delete cascade not null,
  schritt_id    text not null,          -- z. B. 'r_iso'
  gruppe        text,                   -- 'Besichtigung' | 'Messen' | 'Erproben'
  label         text,
  wert_num      numeric,                -- Messwert (falls numerisch)
  wert_text     text,                   -- Text / Select-Wert
  wert_bool     boolean,                -- Checkbox
  einheit       text,
  grenzwert     text,                   -- Anzeige-Grenzwert lt. Norm-Katalog
  bestanden     boolean,                -- maschinelle Bewertung (null = n. bewertbar)
  created_at    timestamptz default now(),
  unique (protokoll_id, schritt_id)
);

alter table public.messwerte enable row level security;

create policy "Eigene Messwerte lesen"   on public.messwerte for select using (auth.uid() = user_id);
create policy "Eigene Messwerte anlegen" on public.messwerte for insert with check (auth.uid() = user_id);
create policy "Eigene Messwerte ändern"  on public.messwerte for update using (auth.uid() = user_id);
create policy "Eigene Messwerte löschen" on public.messwerte for delete using (auth.uid() = user_id);

-- Kunden-Lesezugriff analog Freigaben (C3)
create policy "Freigegebene Messwerte lesen (Kunde)" on public.messwerte
  for select using (
    exists (
      select 1
      from public.protokolle p
      join public.freigaben f on f.anlage_id = p.anlage_id
      where p.id = messwerte.protokoll_id
        and f.kunde_email = auth.jwt() ->> 'email'
    )
  );

create index if not exists idx_messwerte_protokoll on public.messwerte (protokoll_id);
create index if not exists idx_messwerte_trend on public.messwerte (schritt_id, created_at);

-- --------------------------------------------
-- 4. UNVERÄNDERBARKEIT: finalisierte Protokolle sperren
--    (rechtsrelevante Prüfdokumentation, VDE/DGUV)
-- --------------------------------------------
alter table public.protokolle add column if not exists finalisiert_am timestamptz;

-- Bestehende Update/Delete-Policies ersetzen: nur solange NICHT finalisiert
drop policy if exists "Eigene Protokolle ändern"  on public.protokolle;
drop policy if exists "Eigene Protokolle löschen" on public.protokolle;

create policy "Eigene Protokolle ändern" on public.protokolle
  for update using (auth.uid() = user_id and finalisiert_am is null);

create policy "Eigene Protokolle löschen" on public.protokolle
  for delete using (auth.uid() = user_id and finalisiert_am is null);

-- Absicherung auch gegen Policy-Lücken: Trigger blockiert Änderung
-- finalisierter Protokolle (Aufheben der Finalisierung inklusive).
create or replace function public.schuetze_finalisierte_protokolle()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.finalisiert_am is not null and auth.uid() is not null then
      raise exception 'Finalisierte Protokolle können nicht gelöscht werden';
    end if;
    return old;
  end if;
  if old.finalisiert_am is not null and auth.uid() is not null then
    raise exception 'Finalisierte Protokolle können nicht geändert werden';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_schuetze_finalisierte on public.protokolle;
create trigger trg_schuetze_finalisierte
  before update or delete on public.protokolle
  for each row execute function public.schuetze_finalisierte_protokolle();

-- --------------------------------------------
-- 5. AUDIT-TRAIL für Protokolle
-- --------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  tabelle     text not null,
  datensatz   uuid,
  aktion      text not null,            -- INSERT | UPDATE | DELETE
  geaendert_von uuid,
  alt         jsonb,
  neu         jsonb,
  zeitpunkt   timestamptz default now()
);

alter table public.audit_log enable row level security;
-- Kein Client-Zugriff: nur Service-Role liest/schreibt (keine Policies = dicht)

create or replace function public.audit_protokolle()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.audit_log (tabelle, datensatz, aktion, geaendert_von, alt, neu)
  values (
    'protokolle',
    coalesce(new.id, old.id),
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_protokolle on public.protokolle;
create trigger trg_audit_protokolle
  after insert or update or delete on public.protokolle
  for each row execute function public.audit_protokolle();

-- --------------------------------------------
-- 6. MAIL-LOG (Nachvollziehbarkeit der Benachrichtigungen)
-- --------------------------------------------
create table if not exists public.mail_log (
  id          bigint generated always as identity primary key,
  empfaenger  text not null,
  betreff     text,
  status      text not null,            -- gesendet | fehler
  fehler      text,
  anzahl_eintraege int,
  gesendet_am timestamptz default now()
);

alter table public.mail_log enable row level security;
-- Kein Client-Zugriff: nur Service-Role (Edge Function) schreibt

-- ============================================
-- FERTIG C5
-- ============================================
