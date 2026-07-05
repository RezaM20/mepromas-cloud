// Mepromas Cloud — Edge Function: faellige-pruefungen-mail (v2)
// Läuft täglich (pg_cron, siehe supabase_setup_c4_v2_cron_vault.sql).
// v2-Änderungen:
//  - Kein N+1 mehr: genau 2 Abfragen (Protokolle + betroffene Profile),
//    E-Mail kommt aus profiles.email (Sync-Trigger, siehe C5)
//  - Retry mit Backoff für den Resend-Versand
//  - Jeder Versand/Fehler wird in public.mail_log protokolliert

import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ABSENDER = 'Mepromas Cloud <onboarding@resend.dev>'

// Versand mit bis zu 3 Versuchen (Backoff 1s/2s), 429/5xx werden wiederholt
async function sendeMitRetry(payload: unknown): Promise<{ ok: boolean; fehler?: string }> {
  for (let versuch = 1; versuch <= 3; versuch++) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) return { ok: true }
      const text = await res.text()
      if (res.status < 500 && res.status !== 429) return { ok: false, fehler: `${res.status}: ${text}` }
      if (versuch === 3) return { ok: false, fehler: `${res.status} nach 3 Versuchen: ${text}` }
    } catch (e) {
      if (versuch === 3) return { ok: false, fehler: String(e) }
    }
    await new Promise(r => setTimeout(r, versuch * 1000))
  }
  return { ok: false, fehler: 'unerreichbar' }
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const heute = new Date().toISOString().slice(0, 10)
  const in14Tagen = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)

  // Abfrage 1: alle fälligen/bald fälligen Protokolle inkl. Anlagenname
  const { data: protokolle, error } = await supabase
    .from('protokolle')
    .select('id, frist, kind, user_id, anlagen(name, anlagen_id)')
    .not('frist', 'is', null)
    .lte('frist', in14Tagen)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  if (!protokolle?.length) {
    return new Response(JSON.stringify({ versendet: 0, info: 'Keine fälligen Prüfungen.' }), { status: 200 })
  }

  // Nach Nutzer gruppieren
  const proNutzer = new Map<string, typeof protokolle>()
  for (const p of protokolle) {
    if (!proNutzer.has(p.user_id)) proNutzer.set(p.user_id, [])
    proNutzer.get(p.user_id)!.push(p)
  }

  // Abfrage 2: Name + E-Mail aller betroffenen Nutzer in EINEM Request
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', [...proNutzer.keys()])
  const profilMap = new Map((profile ?? []).map(p => [p.id, p]))

  let versendet = 0
  let fehler = 0

  for (const [userId, eintraege] of proNutzer) {
    const prof = profilMap.get(userId)
    if (!prof?.email) continue

    const zeilen = eintraege.map(e => {
      const ueberfaellig = e.frist! < heute
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${e.anlagen?.name || '–'} ${e.anlagen?.anlagen_id ? '(' + e.anlagen.anlagen_id + ')' : ''}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${e.kind || '–'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;color:${ueberfaellig ? '#dc2626' : '#d97706'};font-weight:bold;">${e.frist}${ueberfaellig ? ' (überfällig)' : ''}</td>
      </tr>`
    }).join('')

    const betreff = `Mepromas Cloud: ${eintraege.length} fällige Prüfung(en)`
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#1E3A5F;">Fällige Prüfungen</h2>
        <p>Hallo ${prof.name || ''}, folgende Prüfungen sind fällig oder werden in den nächsten 14 Tagen fällig:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="background:#f5f7fa;text-align:left;">
            <th style="padding:6px 10px;">Anlage</th><th style="padding:6px 10px;">Norm</th><th style="padding:6px 10px;">Frist</th>
          </tr>
          ${zeilen}
        </table>
        <p style="font-size:12px;color:#888;margin-top:16px;">Automatische Benachrichtigung von Mepromas Cloud.</p>
      </div>`

    const ergebnis = await sendeMitRetry({ from: ABSENDER, to: prof.email, subject: betreff, html })

    await supabase.from('mail_log').insert({
      empfaenger: prof.email,
      betreff,
      status: ergebnis.ok ? 'gesendet' : 'fehler',
      fehler: ergebnis.fehler ?? null,
      anzahl_eintraege: eintraege.length,
    })

    if (ergebnis.ok) versendet++
    else fehler++
  }

  return new Response(JSON.stringify({ versendet, fehler }), { status: 200 })
})
