# Manuelle Schritte (nur du kannst diese ausführen)

## SOFORT
1. **Resend-Key `re_QMud...` widerrufen** (resend.com → API Keys → Revoke),
   neuen Key erzeugen. `API_Key.docx` / `Key_Api.docx` überall löschen.

## Supabase (SQL Editor, in dieser Reihenfolge)
2. `supabase_setup_c5_sicherheit_datenmodell.sql` ausführen
3. Vault-Secrets anlegen (einmalig, Werte einsetzen):
   `select vault.create_secret('<SERVICE-ROLE-KEY>', 'service_role_key');`
   `select vault.create_secret('https://icwvipwziilaxhiziwjg.supabase.co', 'projekt_url');`
4. `supabase_setup_c4_v2_cron_vault.sql` ausführen (ersetzt alten Cron)

## Supabase CLI
5. `supabase functions deploy faellige-pruefungen-mail`
6. `supabase secrets set RESEND_API_KEY=<NEUER_KEY>`

## Git + Cloudflare Pages
7. `git init && git add . && git commit -m "C5: Sicherheit, Offline-First, Messwerte, CI"`
8. GitHub-Repo (privat) anlegen, pushen
9. Cloudflare Pages → Projekt "mepromas" → mit Git-Repo verbinden
   (Build: `npm run build`, Output: `dist`, Env-Vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

## Prüfen
10. `npm install && npm test && npm run build` lokal (alles grün, verifiziert)
11. Offline-Test: DevTools → Network → Offline → Protokoll anlegen → online → Auto-Sync
