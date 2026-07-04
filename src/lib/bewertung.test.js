// Vitest-Unit-Tests für die normrelevante Grenzwert-Logik —
// hier sind Fehler am teuersten (rechtsrelevante Prüfbewertung).
import { describe, it, expect } from 'vitest'
import { parseMesswert, bewerteFeld, protokollBestanden, messwerteAusDatenJson, GRENZWERTE } from './bewertung'
import { PRUEFSCHRITTE, leereDatenJson } from './pruefschritte'

describe('parseMesswert', () => {
  it('akzeptiert deutsche Kommaschreibweise', () => expect(parseMesswert('0,45')).toBe(0.45))
  it('akzeptiert Punktschreibweise', () => expect(parseMesswert('1.2')).toBe(1.2))
  it('liefert null bei leer/ungültig', () => {
    expect(parseMesswert('')).toBeNull()
    expect(parseMesswert('abc')).toBeNull()
    expect(parseMesswert(undefined)).toBeNull()
  })
})

describe('bewerteFeld — Grenzfälle', () => {
  it('VDE 0701-0702: R_PE 0,3 Ω genau am Grenzwert = bestanden', () =>
    expect(bewerteFeld('VDE 0701-0702', 'r_pe', '0,3')).toBe(true))
  it('VDE 0701-0702: R_PE 0,31 Ω = nicht bestanden', () =>
    expect(bewerteFeld('VDE 0701-0702', 'r_pe', '0,31')).toBe(false))
  it('R_ISO 1,0 MΩ genau am Mindestwert = bestanden', () =>
    expect(bewerteFeld('VDE 0105-100', 'r_iso', '1,0')).toBe(true))
  it('R_ISO 0,9 MΩ = nicht bestanden', () =>
    expect(bewerteFeld('VDE 0105-100', 'r_iso', '0,9')).toBe(false))
  it('VDE 0100-702: Potentialausgleich 0,6 Ω = nicht bestanden', () =>
    expect(bewerteFeld('VDE 0100-702', 'potentialausgleich_widerstand', '0.6')).toBe(false))
  it('unbekanntes Feld / leerer Wert = null (nicht bewertbar)', () => {
    expect(bewerteFeld('VDE 0105-100', 'gibt_es_nicht', '5')).toBeNull()
    expect(bewerteFeld('VDE 0105-100', 'r_iso', '')).toBeNull()
  })
})

describe('protokollBestanden', () => {
  it('false sobald ein Grenzwert verletzt ist', () =>
    expect(protokollBestanden('VDE 0105-100', { r_pe: '0,2', r_iso: '0,5' })).toBe(false))
  it('true wenn alle bewerteten Werte ok', () =>
    expect(protokollBestanden('VDE 0105-100', { r_pe: '0,2', r_iso: '2,0' })).toBe(true))
  it('null ohne bewertbare Werte', () =>
    expect(protokollBestanden('VDE 0105-100', { funktionspruefung: true })).toBeNull())
})

describe('messwerteAusDatenJson', () => {
  it('erzeugt korrekte Zeilen inkl. Bewertung', () => {
    const zeilen = messwerteAusDatenJson('VDE 0105-100', { r_iso: '0,8', funktionspruefung: true }, 'p1', 'u1')
    const riso = zeilen.find(z => z.schritt_id === 'r_iso')
    expect(riso.wert_num).toBe(0.8)
    expect(riso.bestanden).toBe(false)
    expect(riso.einheit).toBe('MΩ')
    const fp = zeilen.find(z => z.schritt_id === 'funktionspruefung')
    expect(fp.wert_bool).toBe(true)
    expect(fp.bestanden).toBeNull()
  })
  it('überspringt leere Felder', () =>
    expect(messwerteAusDatenJson('VDE 0105-100', { r_iso: '' }, 'p1', 'u1')).toHaveLength(0))
})

describe('Katalog-Konsistenz', () => {
  it('leereDatenJson deckt alle Felder aller 4 Normen ab', () => {
    for (const kind of Object.keys(PRUEFSCHRITTE)) {
      const daten = leereDatenJson(kind)
      const felder = PRUEFSCHRITTE[kind].gruppen.flatMap(g => g.felder.map(f => f.id))
      expect(Object.keys(daten).sort()).toEqual([...new Set(felder)].sort())
    }
  })
  it('jeder Grenzwert referenziert ein existierendes Katalog-Feld', () => {
    for (const [kind, felder] of Object.entries(GRENZWERTE)) {
      const ids = new Set(PRUEFSCHRITTE[kind].gruppen.flatMap(g => g.felder.map(f => f.id)))
      for (const id of Object.keys(felder)) expect(ids.has(id), `${kind}/${id}`).toBe(true)
    }
  })
})
