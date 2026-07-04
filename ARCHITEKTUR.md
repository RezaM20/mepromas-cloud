# Mepromas Cloud — Architektur (Stand C5)

## Überblick
React 19 + Vite SPA (PWA-fähig) → Supabase (PostgreSQL, Auth, RLS, Edge Functions) → Resend (E-Mail).
Deployment: Cloudflare Pages (Auto-Deploy aus Git). Kein eigener Server.

```
Browser (PWA, offline-fähig)
  ├─ Service Worker (public/sw.js): App-Shell-Cache
  ├─ IndexedDB-Warteschlange (src/lib/offline.js): Offline-Erfassung + Auto-Sync
  └─ Supabase JS Client (Anon-Key, RLS erzwingt Sichtbarkeit)
        │
Supabase (EU)
  ├─ Auth (E-Mail/Passwort), Rolle in profiles — nur Admin/Service änderbar (Trigger)
  ├─ Tabellen: profiles, anlagen, protokolle, messwerte, freigaben, audit_log, mail_log
  ├─ RLS: Owner + Kunden-Freigaben (E-Mail-Match); finalisierte Protokolle unveränderbar
  ├─ pg_cron (07:00 UTC) → Edge Function, Secrets aus Vault (kein Klartext-Key)
  └─ Edge Function faellige-pruefungen-mail: 2 Queries (kein N+1), Retry, mail_log
```

## Datenmodell
- **protokolle**: Kopfdaten + `daten_json` (Legacy) + `finalisiert_am` (Sperre)
- **messwerte** (neu, C5): normalisiert — 1 Zeile je Prüfschritt mit `wert_num/text/bool`,
  `einheit`, `grenzwert`, `bestanden`. Basis für Trend-Analyse & ML.
- **audit_log**: jede Änderung an protokolle (Trigger, nur Service-Role lesbar)
- **mail_log**: jeder Versand/Fehler der Benachrichtigungs-Mail

## Sicherheit
- Rollen-Eskalation blockiert (Trigger `schuetze_rolle`)
- Finalisierte Protokolle: Update/Delete durch Policy UND Trigger blockiert
- Service-Role-Key nur im Vault / als Function-Secret — nie im Code oder in cron.job
- Anon-Key ist publishable (by design öffentlich); Schutz ausschließlich über RLS

## Offline-First
1. Erfassung mit clientseitiger UUID (`crypto.randomUUID`)
2. Ohne Netz → IndexedDB-Queue (`speichernOderPuffern`)
3. Sync bei App-Start und `online`-Event; Duplikate (23505) werden verworfen
4. Grenzwert-Bewertung (`src/lib/bewertung.js`) läuft vollständig clientseitig → auch offline

## Qualität
- Vitest: 16 Tests auf Grenzwert-/Katalog-Logik (`npm test`)
- oxlint (`npm run lint`), CI: .github/workflows/ci.yml (lint → test → build)

## Ausbau (Roadmap)
Trend-Dashboard auf `messwerte` → prädiktive Warnung (z. B. R_ISO-Drift) →
OpenAPI-Doku → Pi-5-Edge-Node als Offline-Messknoten.
