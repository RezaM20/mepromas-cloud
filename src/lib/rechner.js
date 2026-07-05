// Elektrotechnik-Rechner — portiert aus mepromas_v89 (calcOhm, calcKabel)
// Reine JS-Funktionen, kein DOM-Zugriff, kein Backend.

export const QS = [1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240]
export const STROM = {
  A1:[14.5,19.5,26,34,46,61,80,99,119,151,182,210,240,273,321],
  A2:[14,18.5,24,31,42,56,73,89,108,136,164,188,216,245,286],
  B1:[17.5,24,32,41,57,76,101,125,151,192,232,269,300,341,400],
  B2:[17.5,24,32,41,57,76,101,125,151,192,232,269,300,341,400],
  C: [21,28,37,48,66,88,110,137,167,214,261,304,343,391,468],
  E: [23,32,42,54,75,100,127,158,192,246,298,346,394,449,538]
}
export const TEMP_F = {10:1.22,15:1.17,20:1.12,25:1.06,30:1.00,35:0.94,40:0.87,45:0.79,50:0.71,55:0.61,60:0.50}
export const SICH = [6,10,13,16,20,25,32,40,50,63,80,100,125,160,200]
export const KAPPA = { Cu: 56, Al: 35 }
export const AL_FACTOR = 0.78

export function haeufung(n) {
  n = parseInt(n) || 1
  if (n <= 1) return 1.0
  if (n === 2) return 0.80
  if (n === 3) return 0.70
  if (n === 4) return 0.65
  if (n === 5) return 0.60
  if (n === 6) return 0.57
  if (n <= 9) return 0.50
  if (n <= 12) return 0.45
  if (n <= 16) return 0.41
  if (n <= 20) return 0.38
  return 0.35
}

/**
 * Ohmsches Gesetz + Leistung — löst nach dem fehlenden Wert aus U/I/R (+ optional P).
 * @param {{U:?number, I:?number, R:?number, P:?number, cos:number, art:'dc'|'ac1'|'ac3'}} eingabe
 */
export function berechneOhm({ U, I, R, P, cos = 1, art = 'ac1' }) {
  const c = art === 'dc' ? 1 : cos
  const given = [U, I, R].filter(x => x !== null && x !== undefined).length

  if (given < 2 && P !== null && P !== undefined) {
    if (U !== null) { I = P / (U * c); R = U / I }
    else if (I !== null) { U = P / (I * c); R = U / I }
    else if (R !== null) { I = Math.sqrt(P / R); U = I * R }
  } else {
    if (U != null && I != null) R = U / I
    else if (U != null && R != null) I = U / R
    else if (I != null && R != null) U = I * R
    else return { fehler: 'Bitte mindestens zwei Werte (U / I / R) eingeben.' }
  }

  const Pw = art === 'ac3' ? Math.sqrt(3) * U * I * c : U * I * c
  return { U, I, R, P: Pw }
}

/**
 * Kabelquerschnitt & Spannungsfall nach VDE 0100-430.
 * @param {{netz:'1'|'3', modus:'P'|'I', leistung:?number, strom:?number, cos:number, laenge:number, duMax:number, material:'Cu'|'Al', verlegeart:string, temperatur:number, haeufungAnzahl:number}} eingabe
 */
export function berechneKabelquerschnitt({
  netz = '1', modus = 'P', leistung, strom, cos = 1, laenge,
  duMax = 3, material = 'Cu', verlegeart = 'B2', temperatur = 30, haeufungAnzahl = 1
}) {
  const U = netz === '3' ? 400 : 230
  const fT = TEMP_F[temperatur] || 1
  const hf = haeufung(haeufungAnzahl)
  const kappa = KAPPA[material]

  let Ib
  if (modus === 'P') {
    if (leistung == null) return { fehler: 'Bitte Leistung eingeben.' }
    Ib = netz === '3' ? leistung / (Math.sqrt(3) * U * cos) : leistung / (U * cos)
  } else {
    if (strom == null) return { fehler: 'Bitte Betriebsstrom eingeben.' }
    Ib = strom
  }
  if (laenge == null) return { fehler: 'Bitte Leitungslänge eingeben.' }

  const In = SICH.find(s => s >= Ib) || SICH[SICH.length - 1]
  const needTab = In / (fT * hf)
  let table = STROM[verlegeart].slice()
  if (material === 'Al') table = table.map(v => v * AL_FACTOR)
  const idxStrom = table.findIndex(v => v >= needTab)

  const duFactor = netz === '3' ? Math.sqrt(3) : 2
  const Amin_du = duFactor * Ib * laenge * cos * 100 / (kappa * U * duMax)
  const idxDu = QS.findIndex(a => a >= Amin_du)

  if (idxStrom < 0 || idxDu < 0) {
    return { fehler: 'Außerhalb Tabelle — Strom/Länge zu groß für ≤240 mm². Bitte aufteilen oder genauer rechnen.' }
  }
  const idx = Math.max(idxStrom, idxDu)
  const A = QS[idx]
  const Iz = table[idx] * fT * hf
  const duPct = duFactor * Ib * A === 0 ? 0 : duFactor * Ib * laenge * cos / (kappa * A * U) * 100
  const limiter = idxDu > idxStrom ? 'Spannungsfall' : 'Strombelastbarkeit'
  const okVDE = Ib <= In && In <= Iz

  return { Ib, In, A, Iz, duPct, limiter, okVDE, fT, hf, netz, material, verlegeart, temperatur }
}
