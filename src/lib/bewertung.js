// Maschinelle Grenzwert-Bewertung der Prüfschritte (Basis für Auto-Bewertung,
// messwerte-Tabelle und spätere Trend-/ML-Auswertung).
// Bewertet werden nur numerische Felder mit definiertem min/max —
// Checkboxen/Selects sind fachlich uneinheitlich und bleiben Prüferentscheidung.

import { PRUEFSCHRITTE } from './pruefschritte'

// Numerische Grenzwerte je Norm und Schritt (abgeleitet aus dem Katalog)
export const GRENZWERTE = {
  'VDE 0100-600': { durchgaengigkeit_pe: { max: 1.0 }, r_iso: { min: 1.0 }, rcd_ausloesezeit: { max: 300 } },
  'VDE 0105-100': { r_pe: { max: 1.0 }, r_iso: { min: 1.0 }, rcd_ausloesezeit: { max: 300 } },
  'VDE 0701-0702': { r_pe: { max: 0.3 }, r_iso: { min: 1.0 }, ersatzableitstrom: { max: 3.5 }, beruehrstrom: { max: 0.5 } },
  'VDE 0100-702': { potentialausgleich_widerstand: { max: 0.5 }, r_iso: { min: 1.0 }, r_pe: { max: 1.0 }, rcd_ausloesestrom: { max: 30 }, rcd_ausloesezeit: { max: 300 } },
}

// Deutsche Kommaschreibweise ("0,45") wird akzeptiert
export function parseMesswert(wert) {
  if (typeof wert === 'number') return Number.isFinite(wert) ? wert : null
  if (typeof wert !== 'string' || wert.trim() === '') return null
  const n = parseFloat(wert.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// true = bestanden, false = Grenzwert verletzt, null = nicht maschinell bewertbar
export function bewerteFeld(kind, schrittId, wert) {
  const g = GRENZWERTE[kind]?.[schrittId]
  if (!g) return null
  const n = parseMesswert(wert)
  if (n === null) return null
  if (g.min !== undefined && n < g.min) return false
  if (g.max !== undefined && n > g.max) return false
  return true
}

// false = mind. ein bewertetes Feld verletzt; true = alle bewerteten ok;
// null = keine bewertbaren Felder ausgefüllt
export function protokollBestanden(kind, datenJson) {
  let gesehen = false
  for (const [id, wert] of Object.entries(datenJson || {})) {
    const b = bewerteFeld(kind, id, wert)
    if (b === false) return false
    if (b === true) gesehen = true
  }
  return gesehen ? true : null
}

// Wandelt daten_json in Zeilen für die normalisierte Tabelle public.messwerte um
export function messwerteAusDatenJson(kind, datenJson, protokollId, userId) {
  const norm = PRUEFSCHRITTE[kind]
  if (!norm) return []
  const zeilen = []
  for (const gruppe of norm.gruppen) {
    for (const feld of gruppe.felder) {
      const wert = datenJson?.[feld.id]
      if (wert === undefined || wert === '' ) continue
      zeilen.push({
        protokoll_id: protokollId,
        user_id: userId,
        schritt_id: feld.id,
        gruppe: gruppe.titel,
        label: feld.label,
        wert_num: feld.type === 'number' ? parseMesswert(wert) : null,
        wert_text: (feld.type === 'text' || feld.type === 'select') ? String(wert) : null,
        wert_bool: feld.type === 'checkbox' ? wert === true : null,
        einheit: feld.unit ?? null,
        grenzwert: feld.grenzwert ?? null,
        bestanden: bewerteFeld(kind, feld.id, wert),
      })
    }
  }
  return zeilen
}
