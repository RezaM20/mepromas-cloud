-- ============================================
-- MEPROMAS CLOUD — Phase C4 Migration
-- Fälligkeitsmanagement / E-Mail-Benachrichtigung
-- Ausführen NACH supabase_setup.sql und supabase_setup_c3.sql
-- ============================================

-- pg_cron + pg_net Erweiterungen aktivieren (im Supabase-Projekt unter
-- Database → Extensions, oder per SQL falls Berechtigung vorhanden):
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Täglich um 07:00 UTC die Edge Function "faellige-pruefungen-mail" aufrufen.
-- WICHTIG: <PROJEKT-REF> und <SERVICE-ROLE-KEY> müssen nach dem Deploy der
-- Edge Function manuell eingesetzt werden (siehe README im supabase/functions
-- Ordner). Dies ist ein manueller Schritt, da er projektspezifische Secrets
-- benötigt, die nicht im Code hinterlegt werden dürfen.
select cron.schedule(
  'mepromas-faellige-pruefungen-mail',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJEKT-REF>.supabase.co/functions/v1/faellige-pruefungen-mail',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE-ROLE-KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Zum Entfernen/Ändern des Crons (falls nötig):
-- select cron.unschedule('mepromas-faellige-pruefungen-mail');

-- ============================================
-- MANUELLE SCHRITTE (außerhalb von SQL, nicht automatisierbar):
-- 1. Resend-Konto erstellen, Domain verifizieren, API-Key erzeugen
-- 2. Supabase CLI: supabase functions deploy faellige-pruefungen-mail
-- 3. Supabase CLI: supabase secrets set RESEND_API_KEY=re_xxx
-- 4. In diesem SQL-Skript <PROJEKT-REF> und <SERVICE-ROLE-KEY> ersetzen,
--    dann erneut ausführen
-- ============================================
