-- ============================================
-- MEPROMAS CLOUD — Phase C3 Migration
-- Multi-User / Rollen / Kundenzugang
-- Ausführen NACH supabase_setup.sql in: Supabase → SQL Editor → Run
-- ============================================

-- 1. Freigaben-Tabelle: erlaubt Kunden Lesezugriff auf bestimmte Anlagen,
--    ohne dass sie Eigentümer (user_id) sind. Zuordnung über E-Mail-Adresse,
--    damit eine Freigabe auch vor der Erst-Registrierung des Kunden möglich ist.
create table if not exists public.freigaben (
  id           uuid default gen_random_uuid() primary key,
  anlage_id    uuid references public.anlagen on delete cascade not null,
  kunde_email  text not null,
  erstellt_von uuid references auth.users on delete cascade not null,
  erstellt_am  timestamptz default now(),
  unique (anlage_id, kunde_email)
);

alter table public.freigaben enable row level security;

-- Nur der Ersteller (Techniker/Admin, Eigentümer der Anlage) darf Freigaben verwalten
create policy "Eigene Freigaben lesen"   on public.freigaben for select using (auth.uid() = erstellt_von);
create policy "Eigene Freigaben anlegen" on public.freigaben for insert with check (auth.uid() = erstellt_von);
create policy "Eigene Freigaben löschen" on public.freigaben for delete using (auth.uid() = erstellt_von);

-- 2. Zusätzliche RLS-Policy: Kunden dürfen Anlagen lesen, die für ihre
--    E-Mail-Adresse freigegeben wurden (zusätzlich zur bestehenden Owner-Policy).
create policy "Freigegebene Anlagen lesen (Kunde)" on public.anlagen
  for select using (
    exists (
      select 1 from public.freigaben f
      where f.anlage_id = anlagen.id
        and f.kunde_email = auth.jwt() ->> 'email'
    )
  );

-- 3. Zusätzliche RLS-Policy: Kunden dürfen Protokolle lesen, die zu einer
--    für sie freigegebenen Anlage gehören.
create policy "Freigegebene Protokolle lesen (Kunde)" on public.protokolle
  for select using (
    exists (
      select 1 from public.freigaben f
      where f.anlage_id = protokolle.anlage_id
        and f.kunde_email = auth.jwt() ->> 'email'
    )
  );

-- ============================================
-- HINWEIS zur Architektur:
-- Bestehende Owner-Policies ("Eigene Anlagen/Protokolle lesen") bleiben
-- unverändert bestehen. Durch mehrere SELECT-Policies auf derselben Tabelle
-- verknüpft Supabase/Postgres automatisch mit OR — ein Nutzer sieht also
-- seine eigenen Datensätze UND die ihm per Freigabe geteilten.
--
-- Das Frontend (AnlagenListe.jsx, ProtokollListe.jsx) ruft ab Phase C3
-- bewusst OHNE expliziten .eq('user_id', ...) Filter ab und überlässt die
-- Sichtbarkeitsprüfung vollständig der RLS — das ist der saubere
-- Supabase-Standardweg für Multi-Rollen-Zugriff.
-- ============================================
