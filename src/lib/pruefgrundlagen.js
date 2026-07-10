/**
 * MEPROMAS — Zentrales Mapping: Protokolltyp (kind) → normierter Prüfgrundlage-Snapshot.
 *
 * WICHTIG: Diese Datei ist die EINZIGE Pflegestelle für Normausgaben.
 * Bei Normneuausgabe (z. B. VDE 0105-100 Neuausgabe 2026) hier den Wert
 * aktualisieren — alle neu signierten Protokolle nehmen den neuen Stand über.
 * Bereits signierte Protokolle behalten ihren einst gespeicherten Snapshot
 * (pruefgrundlage_snapshot in der DB), der am Hash geprüft werden kann.
 *
 * Stand der hinterlegten Normausgaben: recherchiert 10.07.2026.
 * Hinweis: VDE 0705-100 Neuausgabe für 2026 angekündigt — nach Veröffentlichung
 * diesen Eintrag aktualisieren.
 */
export const PRUEFGRUNDLAGEN = {
  // DIN VDE 0100-600:2017-06 — Errichten von Niederspannungsanlagen,
  // Erstprüfung vor Inbetriebnahme (Besichtigung, Erprobung, Messung)
  'VDE 0100-600':
    'DIN VDE 0100-600:2017-06 — Erstprüfung vor Inbetriebnahme',

  // DIN VDE 0105-100:2015-10 + A1:2017-06 — Betrieb von elektrischen Anlagen,
  // Wiederholungsprüfung. Neuausgabe 2026 angekündigt (noch nicht in Kraft).
  'VDE 0105-100':
    'DIN VDE 0105-100:2015-10 + A1:2017-06 — Wiederholungsprüfung (Neuausgabe 2026 angekündigt)',

  // DIN VDE 0701-0702:2008-06 — Prüfung nach Instandsetzung, Änderung elektrischer
  // Geräte und ortsveränderlicher Geräte / DGUV Vorschrift 3.
  // Achtung: Ausgabedatum 2008-06 prüfen — ggf. aktuellere Ausgabe einspielen.
  'VDE 0701-0702':
    'DIN VDE 0701-0702:2008-06 / DGUV Vorschrift 3 — Prüfung ortsveränderlicher Geräte',

  // DIN VDE 0100-702:2018-10 — Schwimmbäder, Brunnen und Wasserspiele.
  // Ausgabedatum 2018-10 prüfen — ggf. aktuellere Ausgabe einspielen.
  'VDE 0100-702':
    'DIN VDE 0100-702:2018-10 — Schwimmbäder, Brunnen und Wasserspiele',
}

/**
 * Gibt den Prüfgrundlage-Snapshot für einen Protokolltyp zurück.
 * Wirft einen Fehler, wenn der Typ nicht im Mapping vorhanden ist —
 * KEIN stiller Fallback, da ein unbekannter Typ auf eine Konfigurationslücke
 * hindeutet und nicht stumm übergangen werden darf.
 *
 * @param {string} kind — Protokolltyp (z. B. 'VDE 0105-100')
 * @returns {string}
 * @throws {Error} wenn kind nicht im Mapping vorhanden ist
 */
export function getPruefgrundlage(kind) {
  const snapshot = PRUEFGRUNDLAGEN[kind]
  if (!snapshot) {
    throw new Error(
      `Unbekannter Protokolltyp "${kind}" — Prüfgrundlage nicht im Mapping hinterlegt. ` +
      `Bitte src/lib/pruefgrundlagen.js ergänzen, bevor dieses Protokoll abgeschlossen wird.`
    )
  }
  return snapshot
}
