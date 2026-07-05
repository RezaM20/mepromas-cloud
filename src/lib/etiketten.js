// Etiketten-Druck (Herma 4113, 63,5×38,1mm, 3×7 = 21/A4)
// Portiert aus mepromas_v89 (aufkleberVorschauOeffnen), entkoppelt von DOM/Lizenz-Logik.

const LOGO_SRC = 'data:image/svg+xml;base64,' + btoa(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#1a3a6e"/><text x="50" y="60" font-size="30" fill="#fff" text-anchor="middle">E</text></svg>'
)

const AUFK_BG =
  'repeating-linear-gradient(88deg,rgba(255,255,255,0) 0px,rgba(255,255,255,0.25) 1px,rgba(255,255,255,0) 2px,rgba(255,255,255,0) 5px),' +
  'linear-gradient(165deg,#fefce8 0%,#fdf9d0 20%,#faf5b8 38%,#fefce8 52%,#fdf8c0 68%,#faf4b0 82%,#fefce8 100%)'

function barcodeSvg(text) {
  const p = [2, 1, 2, 1, 2, 3]
  for (let i = 0; i < text.length; i++) {
    const v = text.charCodeAt(i)
    p.push(((v >> 4) & 3) + 1, ((v >> 2) & 3) + 1, (v & 3) + 1, 2)
  }
  p.push(2, 3, 3, 1, 1, 2)
  const tot = p.reduce((a, b) => a + b, 0)
  const W = 83, H = 10, q = 2, sc = (W - 2 * q) / tot
  let rects = '', x = q, bar = true
  for (const seg of p) {
    const bw = Math.max(1, Math.round(seg * sc))
    if (bar) rects += `<rect x="${x}" y="0" width="${bw}" height="${H}" fill="#000"/>`
    x += bw; bar = !bar
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="white"/>${rects}</svg>`
}

/**
 * Ein Etikett-Objekt für die Druck-Warteschlange.
 * @param {{anlagenName:string, anlagenNr:string, pruefer:string, datum:string, bestanden:boolean}} item
 */
export function baueEtikettHtml(item) {
  const nok = !item.bestanden
  const rahmen = nok ? '#C62828' : '#2E7D32'
  const badgeBg = rahmen
  const icon = nok ? '✕' : '✓'
  const label = nok ? 'NICHT BESTANDEN' : 'BESTANDEN'
  const fLbl = nok ? 'Geprüft am' : 'Nächste Prüfung'
  const bcNr = item.anlagenNr || 'MEPROMAS'
  const bcUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(barcodeSvg(bcNr))))
  const warnRow = nok
    ? '<div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:4pt;font-weight:700;color:#fff;background:#E65100;padding:1.5pt 4pt;border-radius:1.5pt;white-space:nowrap;margin-top:1.5pt;">⚠ Achtung – Inbetriebnahme verboten!</div>'
    : '<div style="height:7pt;"></div>'

  return (
    `<div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;width:63.5mm;height:38.1mm;border:0.6pt solid ${rahmen};overflow:hidden;background:${AUFK_BG};position:relative;display:flex;flex-direction:column;box-sizing:border-box;">` +
      `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none;z-index:0;"><img src="${LOGO_SRC}" style="width:90pt;opacity:0.28;"></div>` +
      `<div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;position:relative;z-index:1;background:rgba(255,255,255,0.65);border-bottom:0.6pt solid ${rahmen};display:flex;align-items:center;justify-content:space-between;padding:0 2.5pt;height:8pt;flex-shrink:0;white-space:nowrap;box-sizing:border-box;">` +
        `<span style="font-size:4.7pt;font-weight:900;color:#1a1a6e;">Stadt Esslingen am Neckar</span>` +
        `<span style="font-size:3.8pt;color:#555;">Elektroabteilung | Tiefbauamt</span>` +
      `</div>` +
      `<div style="flex:1;display:flex;flex-direction:row;position:relative;z-index:1;box-sizing:border-box;overflow:hidden;">` +
        `<div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:2pt 1pt 2pt 1.5pt;overflow:hidden;min-width:0;">` +
          `<div>` +
            `<div style="font-size:5pt;font-weight:700;color:#1a1a6e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Objekt: ${item.anlagenName || '–'}</div>` +
            `<div style="font-size:4pt;color:#444;margin-top:0.5pt;">${fLbl}</div>` +
            `<div style="font-size:9pt;font-weight:900;color:#111;line-height:1.05;margin-top:1pt;">${item.datum || ''}</div>` +
            `<div style="font-size:4.5pt;color:#333;margin-top:1.5pt;"><b style="color:#1a1a6e;">Prüfer:</b> ${item.pruefer || '–'}</div>` +
          `</div>` +
          `<div>` +
            `<div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;display:inline-flex;align-items:center;gap:2pt;background:${badgeBg};color:#fff;font-size:5pt;font-weight:800;border-radius:2pt;padding:1.3pt 4.5pt;white-space:nowrap;"><span style="font-size:6pt;">${icon}</span> ${label}</div>` +
            `<div style="margin-top:1.5pt;">` +
              `<div style="display:flex;flex-direction:row;align-items:stretch;width:100%;max-width:104pt;">` +
                `<div style="width:3pt;flex-shrink:0;border-radius:1pt 0 0 1pt;background:${badgeBg};"></div>` +
                `<img src="${bcUri}" style="flex:1;height:8pt;display:block;">` +
                `<div style="width:3pt;flex-shrink:0;border-radius:0 1pt 1pt 0;background:${badgeBg};"></div>` +
              `</div>` +
              `<div style="font-size:3.7pt;color:#333;letter-spacing:0.3pt;margin-top:0.5pt;text-align:center;width:100%;">${bcNr}</div>` +
            `</div>` +
            warnRow +
          `</div>` +
        `</div>` +
        `<div style="display:flex;align-items:flex-end;justify-content:center;padding:0 2pt 2pt 1pt;flex-shrink:0;"><div style="width:56pt;height:56pt;background:#eee;border:1px dashed #999;display:flex;align-items:center;justify-content:center;font-size:6pt;color:#888;">QR</div></div>` +
      `</div>` +
    `</div>`
  )
}

/**
 * Öffnet ein Druckfenster mit 1 (oder mehreren) Etiketten im Herma-4113-Raster.
 * @param {Array} items - Liste von Etikett-Objekten (siehe baueEtikettHtml)
 */
export function etikettenDrucken(items) {
  const cards = items.map(baueEtikettHtml).join('')
  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Mepromas Etiketten</title><style>` +
    `@page{size:210mm 297mm;margin:0}` +
    `*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box;}` +
    `html,body{margin:0;padding:0;width:210mm;overflow:hidden;}` +
    `body{font-family:Arial,Helvetica,sans-serif;}` +
    `.grid{display:grid;grid-template-columns:repeat(3,63.5mm);grid-auto-rows:38.1mm;gap:0;width:210mm;margin:15.15mm 0 0 9.75mm;padding:0;}` +
    `</style></head><body><div class="grid">${cards}</div></body></html>`
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) { alert('Pop-up blockiert — bitte Pop-ups für diese Seite erlauben.'); return }
  w.document.open(); w.document.write(html); w.document.close()
  setTimeout(() => { try { w.print() } catch (e) {} }, 600)
}

/** Baut ein Etikett-Objekt direkt aus dem Protokoll-Formularstatus (ProtokollNeu.jsx). */
export function etikettAusProtokoll(form, anlageName) {
  return {
    anlagenName: anlageName || '',
    anlagenNr: form.anlage_id || '',
    pruefer: form.pruefer || '',
    datum: form.datum || '',
    bestanden: form.ergebnis === 'ok'
  }
}