-- ============================================
-- MEPROMAS CLOUD — C4 v2: Cron OHNE Klartext-Service-Role
-- Ersetzt den alten Cron aus supabase_setup_c4.sql.
-- Der Service-Role-Key liegt verschlüsselt im Supabase Vault
-- statt im Klartext im cron.job-Eintrag.
-- ============================================

-- 0. Alten (unsicheren) Cron entfernen
select cron.unschedule('mepromas-faellige-pruefungen-mail')
where exists (select 1 from cron.job where jobname = 'mepromas-faellige-pruefungen-mail');

-- 1. EINMALIG manuell ausführen (Platzhalter ersetzen, danach Zeile löschen):
-- select vault.create_secret('<SERVICE-ROLE-KEY>', 'service_role_key');
-- select vault.create_secret('https://<PROJEKT-REF>.supabase.co', 'projekt_url');

-- 2. Cron: Key wird zur Laufzeit aus dem Vault gelesen
select cron.schedule(
  'mepromas-faellige-pruefungen-mail',
  '0 7 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'projekt_url')
           || '/functions/v1/faellige-pruefungen-mail',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
