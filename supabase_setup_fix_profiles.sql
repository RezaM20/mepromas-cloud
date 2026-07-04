-- ============================================
-- MEPROMAS CLOUD — Fix: Automatische Profil-Erstellung
-- Behebt: Profil-Datensatz fehlt, wenn E-Mail-Bestätigung aktiv ist
--         (Insert-Versuch im Frontend läuft vor aktiver Session ins Leere)
-- Ausführen in: Supabase → SQL Editor → Run
-- ============================================

-- Funktion: legt bei jeder neuen Registrierung automatisch eine Zeile
-- in public.profiles an. Läuft mit erhöhten Rechten (security definer),
-- daher unabhängig von RLS und vom Bestätigungs-Status der E-Mail.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, firma, rolle, sprache)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'firma', ''),
    'techniker',
    'de'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger: feuert automatisch nach jedem neuen Eintrag in auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Bestehende Nutzer ohne Profil nachträglich reparieren
-- (z. B. dein Test-Account von eben, falls dort der Name fehlt)
-- ============================================
insert into public.profiles (id, name, firma, rolle, sprache)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', ''),
  coalesce(u.raw_user_meta_data->>'firma', ''),
  'techniker',
  'de'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
