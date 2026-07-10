-- ============================================================
-- MEPROMAS CLOUD — Phase C6: Signatur-Sperrung für Prüfprotokolle
-- NUR VORLEGEN — NICHT AUSFÜHREN bis explizite Freigabe
-- Idempotent: Skript kann mehrfach ausgeführt werden ohne Fehler
-- Voraussetzung: C1–C5 bereits eingespielt
-- Stand: 10.07.2026
-- ============================================================


-- ============================================================
-- TEIL A: Neue Spalten auf protokolle
--
--   finalisiert_von_user_id       — FK auf auth.users; wer hat signiert
--   finalisiert_von_name_snapshot — Anzeigename zum Zeitpunkt der Signatur
--                                   (Textschnappschuss; unveränderlich,
--                                    da Nutzerprofile sich ändern können)
--   pruefgrundlage_snapshot       — Normtextstring zum Zeitpunkt der Signatur,
--                                   z. B. "DIN VDE 0105-100:2015-10 + A1:2017-06 ..."
--                                   Quelldatei im Frontend: src/lib/pruefgrundlagen.js
--                                   Wird mitsigniert (Teil des SHA-256-Payloads).
--   content_hash                  — SHA-256 über Protokolldaten + Messwerte +
--                                   pruefgrundlage_snapshot (berechnet im Frontend
--                                   via Web Crypto API)
-- ============================================================
ALTER TABLE public.protokolle
  ADD COLUMN IF NOT EXISTS finalisiert_von_user_id       uuid
    REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS finalisiert_von_name_snapshot text,
  ADD COLUMN IF NOT EXISTS pruefgrundlage_snapshot       text,
  ADD COLUMN IF NOT EXISTS content_hash                  text;


-- ============================================================
-- TEIL B: Trigger auf messwerte
--   Blockiert INSERT, UPDATE und DELETE, sobald das zugehörige
--   Protokoll finalisiert ist (protokolle.finalisiert_am IS NOT NULL).
--
--   Service-Role-Ausnahme (identisch zu trg_schuetze_finalisierte
--   auf protokolle, C5-Migration): nur blockieren wenn
--   auth.uid() IS NOT NULL → Migrationen und Edge Functions
--   (service_role) bleiben uneingeschränkt.
--
--   Bei INSERT:        protokoll_id aus NEW
--   Bei UPDATE/DELETE: protokoll_id aus OLD
--
--   SECURITY DEFINER: NICHT verwendet.
--   Begründung: Die Funktion liest nur public.protokolle, auf das
--   der Client via RLS ohnehin Zugriff hat. SECURITY DEFINER wäre
--   hier unnötig und würde das Prinzip minimaler Rechte verletzen.
-- ============================================================
CREATE OR REPLACE FUNCTION public.schuetze_finalisierte_messwerte()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_protokoll_id uuid;
  v_finalisiert  timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_protokoll_id := NEW.protokoll_id;
  ELSE
    v_protokoll_id := OLD.protokoll_id;
  END IF;

  -- Nur bei Client-Zugriffen sperren (auth.uid() IS NOT NULL)
  IF auth.uid() IS NOT NULL THEN
    SELECT finalisiert_am
      INTO v_finalisiert
      FROM public.protokolle
     WHERE id = v_protokoll_id;

    IF v_finalisiert IS NOT NULL THEN
      RAISE EXCEPTION
        'Messwerte finalisierter Protokolle können nicht geändert werden '
        '(Protokoll %, finalisiert am %)',
        v_protokoll_id, v_finalisiert;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schuetze_finalisierte_messwerte ON public.messwerte;
CREATE TRIGGER trg_schuetze_finalisierte_messwerte
  BEFORE INSERT OR UPDATE OR DELETE ON public.messwerte
  FOR EACH ROW EXECUTE FUNCTION public.schuetze_finalisierte_messwerte();


-- ============================================================
-- TEIL C: Trigger auf protokolle (BEFORE UPDATE)
--   Validiert den Finalisierungs-Übergang NULL → NOT NULL.
--
--   ── Wechselwirkung mit bestehendem Trigger (C5) ──────────
--   Name:     trg_schuetze_finalisierte
--   Funktion: schuetze_finalisierte_protokolle()
--   Logik:    Blockiert ALLE Updates wenn OLD.finalisiert_am IS NOT NULL
--             und auth.uid() IS NOT NULL.
--
--   → Nachträgliche Änderungen an finalisiert_am,
--     finalisiert_von_user_id, pruefgrundlage_snapshot und
--     content_hash sind durch den bestehenden Trigger bereits
--     vollständig gesperrt. Kein zusätzlicher Schutz nötig,
--     kein Ersetzen des bestehenden Triggers erforderlich.
--
--   → Triggerreihenfolge (PostgreSQL: alphabetisch nach Triggername):
--     1. trg_schuetze_finalisierte   — blockiert wenn OLD finalisiert
--     2. trg_validiere_finalisierung — prüft Übergang NULL → NOT NULL
--     Beim ersten Finalisierungs-Update ist OLD.finalisiert_am IS NULL,
--     also lässt Trigger 1 die Zeile durch; Trigger 2 validiert.
--
--   Geprüfte Bedingungen beim Übergang:
--     • auth.uid() muss gesetzt sein (kein anonymer Client)
--     • finalisiert_von_user_id MUSS = auth.uid() sein
--     • finalisiert_von_name_snapshot darf nicht NULL sein
--     • pruefgrundlage_snapshot darf nicht NULL sein
--     • content_hash darf nicht NULL sein
--     • user_id (Protokollinhaber) darf nicht NULL sein
--
--   SECURITY DEFINER: NICHT verwendet.
--   Begründung: Funktion prüft ausschließlich Werte in NEW/OLD sowie
--   auth.uid(). Kein erhöhter Datenbankkontext erforderlich.
-- ============================================================
CREATE OR REPLACE FUNCTION public.validiere_finalisierung()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Nur beim Übergang NULL → NOT NULL aktiv werden
  IF OLD.finalisiert_am IS NULL AND NEW.finalisiert_am IS NOT NULL THEN

    -- Serverzeit erzwingen: Client-Uhr (finalize() in ProtokollDetail.jsx
    -- setzt new Date().toISOString()) wird hier überschrieben, damit der
    -- gespeicherte Zeitstempel nicht von Uhr-Drift des Clients abhängt.
    NEW.finalisiert_am := now();

    -- Aktiver Client-Nutzer erforderlich
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION
        'Finalisierung erfordert eine aktive Authentifizierung (auth.uid() IS NULL)';
    END IF;

    -- Signaturautor muss der angemeldete Nutzer sein
    IF NEW.finalisiert_von_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION
        'finalisiert_von_user_id muss dem angemeldeten Nutzer entsprechen '
        '(erwartet: %, erhalten: %)',
        auth.uid(), NEW.finalisiert_von_user_id;
    END IF;

    -- Pflichtfelder der Signatur
    IF NEW.finalisiert_von_name_snapshot IS NULL THEN
      RAISE EXCEPTION
        'finalisiert_von_name_snapshot darf bei der Finalisierung nicht NULL sein';
    END IF;

    IF NEW.pruefgrundlage_snapshot IS NULL THEN
      RAISE EXCEPTION
        'pruefgrundlage_snapshot darf bei der Finalisierung nicht NULL sein';
    END IF;

    IF NEW.content_hash IS NULL THEN
      RAISE EXCEPTION
        'content_hash darf bei der Finalisierung nicht NULL sein';
    END IF;

    -- Sicherheitsnetz: Protokollinhaber-Referenz muss vorhanden sein
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION
        'user_id (Protokollinhaber) darf bei der Finalisierung nicht NULL sein';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validiere_finalisierung ON public.protokolle;
CREATE TRIGGER trg_validiere_finalisierung
  BEFORE UPDATE ON public.protokolle
  FOR EACH ROW EXECUTE FUNCTION public.validiere_finalisierung();


-- ============================================================
-- FERTIG — Phase C6
-- Alle Änderungen sind idempotent:
--   ALTER TABLE ... ADD COLUMN IF NOT EXISTS
--   CREATE OR REPLACE FUNCTION
--   DROP TRIGGER IF EXISTS + CREATE TRIGGER
-- ============================================================
