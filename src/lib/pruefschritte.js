// Norm-spezifische Prüfschritte / Messwertfelder für die 4 unterstützten Normtypen.
// Wird sowohl im Protokoll-Erstellungsformular als auch im PDF-Export verwendet.
// type: 'number' | 'text' | 'select' | 'checkbox'

export const PRUEFSCHRITTE = {
  'VDE 0100-600': {
    label: 'Erstprüfung vor Inbetriebnahme',
    gruppen: [
      {
        titel: 'Besichtigung',
        felder: [
          { id: 'besichtigung_ip', label: 'Schutzart (IP) korrekt', type: 'checkbox' },
          { id: 'besichtigung_kennzeichnung', label: 'Kennzeichnung / Beschriftung vollständig', type: 'checkbox' },
          { id: 'besichtigung_leitungsfuehrung', label: 'Leitungsführung ordnungsgemäß', type: 'checkbox' },
        ]
      },
      {
        titel: 'Erproben',
        felder: [
          { id: 'durchgaengigkeit_pe', label: 'Durchgängigkeit Schutzleiter', unit: 'Ω', type: 'number', grenzwert: '≤ 1,0 Ω' },
          { id: 'r_iso', label: 'Isolationswiderstand R_ISO', unit: 'MΩ', type: 'number', grenzwert: '≥ 1,0 MΩ (≤500V)' },
          { id: 'schleifenimpedanz', label: 'Schleifenimpedanz Z_S', unit: 'Ω', type: 'number' },
          { id: 'rcd_auslösestrom', label: 'RCD Auslösestrom I_∆n', unit: 'mA', type: 'number' },
          { id: 'rcd_ausloesezeit', label: 'RCD Auslösezeit', unit: 'ms', type: 'number', grenzwert: '≤ 300 ms (30mA)' },
          { id: 'drehfeld', label: 'Drehfeld rechts (bei Drehstrom)', type: 'checkbox' },
          { id: 'funktionspruefung', label: 'Funktionsprüfung bestanden', type: 'checkbox' },
        ]
      }
    ]
  },
  'VDE 0105-100': {
    label: 'Wiederholungsprüfung',
    gruppen: [
      {
        titel: 'Besichtigung',
        felder: [
          { id: 'sichtschaeden', label: 'Sichtbare Schäden / Mängel', type: 'checkbox' },
          { id: 'kennzeichnung', label: 'Kennzeichnung vorhanden', type: 'checkbox' },
        ]
      },
      {
        titel: 'Messen',
        felder: [
          { id: 'r_pe', label: 'Schutzleiterwiderstand R_PE', unit: 'Ω', type: 'number', grenzwert: '≤ 1,0 Ω' },
          { id: 'r_iso', label: 'Isolationswiderstand R_ISO', unit: 'MΩ', type: 'number', grenzwert: '≥ 1,0 MΩ' },
          { id: 'schleifenimpedanz', label: 'Schleifenimpedanz Z_S', unit: 'Ω', type: 'number' },
          { id: 'rcd_ausloesezeit', label: 'RCD Auslösezeit', unit: 'ms', type: 'number', grenzwert: '≤ 300 ms (30mA)' },
        ]
      },
      {
        titel: 'Erproben',
        felder: [
          { id: 'funktionspruefung', label: 'Funktionsprüfung bestanden', type: 'checkbox' },
        ]
      }
    ]
  },
  'VDE 0701-0702': {
    label: 'Geräteprüfung (ortsveränderliche Geräte) / DGUV Vorschrift 3',
    gruppen: [
      {
        titel: 'Besichtigung',
        felder: [
          { id: 'sichtpruefung', label: 'Sichtprüfung (Gehäuse, Leitung, Stecker)', type: 'checkbox' },
          { id: 'geraeteklasse', label: 'Geräteklasse', type: 'select', optionen: ['Schutzklasse I', 'Schutzklasse II', 'Schutzklasse III'] },
        ]
      },
      {
        titel: 'Messen',
        felder: [
          { id: 'r_pe', label: 'Schutzleiterwiderstand R_PE', unit: 'Ω', type: 'number', grenzwert: '≤ 0,3 Ω (Leitung ≤5m)' },
          { id: 'r_iso', label: 'Isolationswiderstand R_ISO', unit: 'MΩ', type: 'number', grenzwert: '≥ 1,0 MΩ (SK I)' },
          { id: 'ersatzableitstrom', label: 'Ersatzableitstrom', unit: 'mA', type: 'number', grenzwert: '≤ 3,5 mA (SK I)' },
          { id: 'beruehrstrom', label: 'Berührungsstrom (falls SK II)', unit: 'mA', type: 'number', grenzwert: '≤ 0,5 mA' },
        ]
      },
      {
        titel: 'Erproben',
        felder: [
          { id: 'funktionspruefung', label: 'Funktionsprüfung bestanden', type: 'checkbox' },
        ]
      }
    ]
  },
  'VDE 0100-702': {
    label: 'Wasserspiel- / Brunnenanlage (Becken und Wasserspiele)',
    gruppen: [
      {
        titel: 'Besichtigung',
        felder: [
          { id: 'ip_schutzart', label: 'IP-Schutzart entsprechend Bereich (0/1/2)', type: 'checkbox' },
          { id: 'potentialausgleich_sichtbar', label: 'Potentialausgleich sichtbar vorhanden', type: 'checkbox' },
        ]
      },
      {
        titel: 'Messen',
        felder: [
          { id: 'potentialausgleich_widerstand', label: 'Widerstand Potentialausgleich', unit: 'Ω', type: 'number', grenzwert: '≤ 0,5 Ω' },
          { id: 'r_iso', label: 'Isolationswiderstand R_ISO', unit: 'MΩ', type: 'number', grenzwert: '≥ 1,0 MΩ' },
          { id: 'r_pe', label: 'Schutzleiterwiderstand R_PE', unit: 'Ω', type: 'number', grenzwert: '≤ 1,0 Ω' },
          { id: 'rcd_ausloesestrom', label: 'RCD Auslösestrom I_∆n', unit: 'mA', type: 'number', grenzwert: '≤ 30 mA' },
          { id: 'rcd_ausloesezeit', label: 'RCD Auslösezeit', unit: 'ms', type: 'number', grenzwert: '≤ 300 ms' },
        ]
      },
      {
        titel: 'Erproben',
        felder: [
          { id: 'rcd_pruefknopf', label: 'RCD-Prüftaste ausgelöst', type: 'checkbox' },
          { id: 'funktionspruefung', label: 'Funktionsprüfung bestanden', type: 'checkbox' },
        ]
      }
    ]
  }
}

export function leereDatenJson(kind) {
  const norm = PRUEFSCHRITTE[kind]
  if (!norm) return {}
  const out = {}
  norm.gruppen.forEach(g => g.felder.forEach(f => { out[f.id] = f.type === 'checkbox' ? false : '' }))
  return out
}
