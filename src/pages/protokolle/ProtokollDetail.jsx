import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import jsPDF from 'jspdf'
import { PRUEFSCHRITTE } from '../../lib/pruefschritte'
import { PRUEFGRUNDLAGEN, getPruefgrundlage } from '../../lib/pruefgrundlagen'

// ---------------------------------------------------------------------------
// Kanonische Feldreihenfolgen für reproduzierbaren SHA-256-Hash.
// Reihenfolge NICHT ändern — jede Änderung macht alle bisherigen Hashes
// unvergleichbar mit neu berechneten.
// ---------------------------------------------------------------------------
const PROTOKOLL_HASH_FELDER = [
  'id', 'user_id', 'anlage_id', 'kind', 'datum', 'pruefer',
  'frist', 'intervall', 'ergebnis', 'bemerkung', 'daten_json', 'created_at',
]
const MESSWERT_HASH_FELDER = [
  'id', 'protokoll_id', 'user_id', 'schritt_id', 'gruppe', 'label',
  'wert_num', 'wert_text', 'wert_bool', 'einheit', 'grenzwert', 'bestanden', 'created_at',
]

/** Extrahiert definierte Felder in stabiler Reihenfolge (fehlende → null). */
function pick(obj, keys) {
  const out = {}
  for (const k of keys) out[k] = obj[k] ?? null
  return out
}

/** SHA-256 via Web Crypto API (keine externe Bibliothek). */
async function sha256(obj) {
  const encoded = new TextEncoder().encode(JSON.stringify(obj))
  const buf = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Formatiert ISO-Timestamp für deutsche Anzeige. */
function fmtDatum(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

// ---------------------------------------------------------------------------

export default function ProtokollDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [p, setP]                         = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [finalizing, setFinalizing]       = useState(false)
  const [finalizeError, setFinalizeError] = useState('')
  const [showConfirm, setShowConfirm]     = useState(false)

  useEffect(() => { if (user && id) load() }, [user, id])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('protokolle')
      .select('*, anlagen(name, anlagen_id, standort, norm, intervall)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (error) setError(error.message)
    setP(data)
    setLoading(false)
  }

  // -------------------------------------------------------------------------
  // Finalisierung
  // -------------------------------------------------------------------------
  async function finalize() {
    setFinalizing(true)
    setFinalizeError('')
    try {
      // 1. Frischen Nutzer holen — NICHT aus State/Session-Cache,
      //    um Token-Ablauf oder Session-Wechsel sicher zu erkennen.
      const { data: { user: freshUser }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !freshUser) {
        throw new Error('Authentifizierung fehlgeschlagen. Bitte neu anmelden.')
      }

      // 2. Anzeigename aus profiles laden (Snapshot zum Zeitpunkt der Signatur).
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', freshUser.id)
        .single()
      if (profileErr) throw new Error('Nutzerprofil konnte nicht geladen werden.')
      const nameSnapshot = profile?.name || freshUser.email || freshUser.id

      // 3. Prüfgrundlage aus zentralem Mapping bestimmen.
      //    getPruefgrundlage() wirft bei unbekanntem kind — KEIN stiller Fallback.
      //    Bei Fehler: Abbruch mit klarer Meldung, nichts wird in die DB geschrieben.
      const pruefgrundlageSnapshot = getPruefgrundlage(p.kind)

      // 4. Zugehörige Messwerte laden — nach schritt_id sortiert für
      //    deterministischen Hash (Reihenfolge darf sich nicht unterscheiden).
      const { data: messwerte, error: mwErr } = await supabase
        .from('messwerte')
        .select('*')
        .eq('protokoll_id', id)
        .order('schritt_id')
      if (mwErr) throw new Error('Messwerte konnten nicht geladen werden.')

      // 5. SHA-256 über kanonisch serialisierten Inhalt berechnen.
      //    Payload umfasst: Protokolldaten, Messwerte, Prüfgrundlage.
      //    Stabile Feldreihenfolge stellt Reproduzierbarkeit sicher.
      const hashPayload = {
        protokoll:              pick(p, PROTOKOLL_HASH_FELDER),
        messwerte:              (messwerte || []).map(m => pick(m, MESSWERT_HASH_FELDER)),
        pruefgrundlage_snapshot: pruefgrundlageSnapshot,
      }
      const contentHash = await sha256(hashPayload)

      // 6. Update in einem einzigen Schreibvorgang.
      //    Hinweis zu finalisiert_am: hier wird Client-UTC verwendet.
      //    Serverzeit (kein Uhr-Drift) wäre robuster; nachrüstbar via
      //    PostgreSQL-DEFAULT NOW() on Update oder Supabase RPC.
      const { error: updateErr } = await supabase
        .from('protokolle')
        .update({
          finalisiert_von_user_id:       freshUser.id,
          finalisiert_von_name_snapshot: nameSnapshot,
          pruefgrundlage_snapshot:       pruefgrundlageSnapshot,
          content_hash:                  contentHash,
          finalisiert_am:                new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', freshUser.id)

      if (updateErr) {
        // Erwarteter Fehler solange die neuen Spalten noch nicht in der DB existieren.
        if (updateErr.code === '42703' || updateErr.message?.toLowerCase().includes('column')) {
          throw new Error(
            'Datenbankspalten fehlen noch (finalisiert_von_user_id, ' +
            'finalisiert_von_name_snapshot, pruefgrundlage_snapshot, content_hash). ' +
            'Bitte zuerst das SQL-Migrationsskript supabase_setup_c6_signatur_sperrung.sql ausführen.'
          )
        }
        throw new Error(`Speichern fehlgeschlagen: ${updateErr.message}`)
      }

      await load()
      setShowConfirm(false)
    } catch (err) {
      setFinalizeError(err.message)
    } finally {
      setFinalizing(false)
    }
  }

  // -------------------------------------------------------------------------
  // PDF-Export (unverändert)
  // -------------------------------------------------------------------------
  function exportPdf() {
    if (!p) return
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const a = p.anlagen || {}
    const margin = 18
    let y = 20

    doc.setFillColor(30, 58, 95)
    doc.rect(0, 0, 210, 14, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('MEPROMAS', margin, 9.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Elektro-Prüfprotokoll', 210 - margin, 9.5, { align: 'right' })

    doc.setTextColor(20, 20, 20)
    y = 26
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(p.kind || '–', margin, y)
    y += 8

    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y, 210 - margin, y)
    y += 8

    const row = (label, value) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
      doc.text(label, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(value ?? '–'), margin + 50, y)
      y += 7
    }

    row('Anlage:', a.name)
    row('Anlagen-ID:', a.anlagen_id)
    row('Standort:', a.standort)
    row('Prüfnorm:', a.norm || p.kind)
    row('Prüfdatum:', p.datum)
    row('Prüfer:', p.pruefer)
    row('Nächste Prüfung:', p.frist)
    row('Intervall:', p.intervall ? `${p.intervall} Monate` : '–')

    y += 3
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y, 210 - margin, y)
    y += 10

    const ergFarbe = p.ergebnis === 'ok' ? [22, 163, 74] : p.ergebnis === 'nichtok' ? [220, 38, 38] : [217, 119, 6]
    const ergText = p.ergebnis === 'ok' ? 'BESTANDEN' : p.ergebnis === 'nichtok' ? 'NICHT BESTANDEN' : 'MÄNGEL / HINWEISE'
    doc.setFillColor(...ergFarbe)
    doc.roundedRect(margin, y, 70, 12, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(ergText, margin + 35, y + 8, { align: 'center' })
    doc.setTextColor(20, 20, 20)
    y += 20

    const normDef = PRUEFSCHRITTE[p.kind]
    if (normDef && p.daten_json && Object.keys(p.daten_json).length > 0) {
      normDef.gruppen.forEach(gruppe => {
        if (y > 255) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
        doc.setTextColor(30, 58, 95)
        doc.text(gruppe.titel, margin, y)
        y += 6
        doc.setTextColor(20, 20, 20)
        gruppe.felder.forEach(feld => {
          if (y > 270) { doc.addPage(); y = 20 }
          const wert = p.daten_json[feld.id]
          let wertText = '–'
          if (feld.type === 'checkbox') wertText = wert ? 'OK' : '–'
          else if (wert !== '' && wert != null) wertText = `${wert}${feld.unit ? ' ' + feld.unit : ''}`
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
          doc.text(feld.label, margin + 3, y)
          doc.setFont('helvetica', 'bold')
          doc.text(wertText, 160, y, { align: 'right' })
          y += 5.5
        })
        y += 2
      })
      y += 4
    }

    if (p.bemerkung) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
      doc.text('Bemerkung / Mängel:', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(p.bemerkung, 210 - margin * 2)
      doc.text(lines, margin, y)
      y += lines.length * 5 + 6
    }

    y = Math.max(y, 250)
    doc.setDrawColor(150, 150, 150)
    doc.line(margin, y, margin + 70, y)
    doc.line(120, y, 120 + 70, y)
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text('Unterschrift Prüfer', margin, y + 4)
    doc.text('Datum, Ort', 120, y + 4)

    doc.setFontSize(7)
    doc.text(`Erstellt mit Mepromas Cloud · ${new Date().toLocaleDateString('de-DE')}`, margin, 287)

    const dateiname = `Protokoll_${(a.anlagen_id || a.name || 'Anlage').replace(/[^a-zA-Z0-9_-]/g, '_')}_${p.datum}.pdf`
    doc.save(dateiname)
  }

  // -------------------------------------------------------------------------
  // Hilfsfunktionen
  // -------------------------------------------------------------------------
  const ergBadge = e => e === 'ok' ? 'success' : e === 'nichtok' ? 'danger' : 'warning'
  const ergLabel = e => e === 'ok' ? t('protokoll.bestanden') : e === 'nichtok' ? t('protokoll.nicht_bestanden') : 'Mängel'

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (loading) return <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
  if (error || !p) return <Card className="text-center py-12 text-gray-400">{error || 'Protokoll nicht gefunden.'}</Card>

  const isFinalized = Boolean(p.finalisiert_am)

  // Prüfgrundlage für die Confirm-Box (render-time, nicht-werfend)
  const pruefgrundlageVorschau = PRUEFGRUNDLAGEN[p.kind] || null

  return (
    <div className="max-w-2xl space-y-5">

      {/* ------------------------------------------------------------------ */}
      {/* Status-Banner                                                        */}
      {/* ------------------------------------------------------------------ */}
      {isFinalized ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <div className="flex items-start gap-2">
            <span className="text-base leading-none mt-0.5 shrink-0">🔒</span>
            <div className="min-w-0">
              <span className="font-semibold">Abgeschlossen &amp; signiert</span>
              {' von '}
              <span className="font-semibold">{p.finalisiert_von_name_snapshot || '–'}</span>
              {' am '}
              <span className="font-semibold">{fmtDatum(p.finalisiert_am)}</span>
              {p.pruefgrundlage_snapshot && (
                <div className="mt-1 text-xs text-green-700">
                  Prüfgrundlage: <span className="font-medium">{p.pruefgrundlage_snapshot}</span>
                </div>
              )}
              {p.content_hash && (
                <div className="mt-1 font-mono text-xs text-green-600 break-all">
                  SHA-256: {p.content_hash}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="shrink-0">⚠️</span>
          <span>Dieses Protokoll ist noch nicht abgeschlossen.</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Kopfzeile                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">← {t('common.back')}</button>
          <h1 className="text-2xl font-black text-[#1E3A5F] mt-1">{p.kind}</h1>
        </div>
        <Badge variant={ergBadge(p.ergebnis)}>{ergLabel(p.ergebnis)}</Badge>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Protokolldaten (readonly wenn finalisiert)                           */}
      {/* ------------------------------------------------------------------ */}
      <Card className={isFinalized ? 'opacity-90 pointer-events-none select-none' : ''}>
        <CardHeader title={p.anlagen?.name || 'Anlage'} subtitle={p.anlagen?.anlagen_id} />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div><dt className="text-gray-400 text-xs">Standort</dt><dd className="font-medium">{p.anlagen?.standort || '–'}</dd></div>
          <div><dt className="text-gray-400 text-xs">Norm</dt><dd className="font-medium">{p.anlagen?.norm || p.kind}</dd></div>
          <div><dt className="text-gray-400 text-xs">{t('protokoll.datum')}</dt><dd className="font-medium">{p.datum}</dd></div>
          <div><dt className="text-gray-400 text-xs">{t('protokoll.pruefer')}</dt><dd className="font-medium">{p.pruefer || '–'}</dd></div>
          <div><dt className="text-gray-400 text-xs">{t('protokoll.frist')}</dt><dd className="font-medium">{p.frist || '–'}</dd></div>
          <div><dt className="text-gray-400 text-xs">{t('protokoll.intervall')}</dt><dd className="font-medium">{p.intervall ? `${p.intervall} Monate` : '–'}</dd></div>
        </dl>
        {p.bemerkung && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-gray-400 text-xs mb-1">{t('protokoll.bemerkung')}</div>
            <div className="text-sm whitespace-pre-wrap">{p.bemerkung}</div>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Prüfschritte / Messwerte                                            */}
      {/* ------------------------------------------------------------------ */}
      {PRUEFSCHRITTE[p.kind] && p.daten_json && Object.keys(p.daten_json).length > 0 && (
        <Card>
          <CardHeader title="Prüfschritte / Messwerte" />
          <div className="space-y-4">
            {PRUEFSCHRITTE[p.kind].gruppen.map(gruppe => (
              <div key={gruppe.titel}>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{gruppe.titel}</div>
                <div className="space-y-1">
                  {gruppe.felder.map(feld => {
                    const wert = p.daten_json[feld.id]
                    const angezeigt = feld.type === 'checkbox'
                      ? (wert ? '✓ OK' : '–')
                      : (wert !== '' && wert != null ? `${wert}${feld.unit ? ' ' + feld.unit : ''}` : '–')
                    return (
                      <div key={feld.id} className="flex justify-between text-sm py-0.5 border-b border-gray-50 last:border-0">
                        <span className="text-gray-600">{feld.label}</span>
                        <span className="font-semibold">{angezeigt}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Bestätigungs-Box                                                     */}
      {/* ------------------------------------------------------------------ */}
      {showConfirm && !isFinalized && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
          <div className="font-semibold text-red-800 text-sm">⚠️ Achtung — irreversibler Schritt</div>
          <p className="text-sm text-red-700 leading-relaxed">
            Dieses Protokoll wird dauerhaft mit Ihrem angemeldeten Konto verknüpft
            und für alle zukünftigen Änderungen gesperrt. Der Inhalt wird
            kryptographisch signiert (SHA-256).{' '}
            <strong>Dieser Schritt kann nicht rückgängig gemacht werden.</strong>
          </p>

          {/* Eingefrorene Prüfgrundlage */}
          {pruefgrundlageVorschau ? (
            <div className="rounded bg-red-100 border border-red-200 px-3 py-2 text-xs text-red-800">
              <span className="font-semibold">Eingefrorene Prüfgrundlage:</span>{' '}
              {pruefgrundlageVorschau}
            </div>
          ) : (
            <div className="rounded bg-yellow-100 border border-yellow-300 px-3 py-2 text-xs text-yellow-900 font-semibold">
              ⛔ Unbekannter Protokolltyp „{p.kind}" — Prüfgrundlage nicht im Mapping hinterlegt.
              Abschließen nicht möglich. Bitte src/lib/pruefgrundlagen.js ergänzen.
            </div>
          )}

          {finalizeError && (
            <div className="rounded bg-red-100 border border-red-300 px-3 py-2 text-sm text-red-800">
              {finalizeError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              onClick={finalize}
              disabled={finalizing || !pruefgrundlageVorschau}
              variant="danger"
              className="gap-2"
            >
              {finalizing ? '…Wird gespeichert' : '🔒 Ja, jetzt abschließen & signieren'}
            </Button>
            <Button
              onClick={() => { setShowConfirm(false); setFinalizeError('') }}
              disabled={finalizing}
              variant="ghost"
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Aktionsleiste                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={exportPdf} variant="success" className="gap-2">📄 {t('protokoll.pdf')}</Button>
        <Link to={`/anlagen/${p.anlage_id}`}><Button variant="ghost">Zur Anlage</Button></Link>
        {!isFinalized && !showConfirm && (
          <Button
            onClick={() => { setFinalizeError(''); setShowConfirm(true) }}
            variant="secondary"
            className="gap-2 ml-auto"
          >
            🔒 Abschließen &amp; signieren
          </Button>
        )}
      </div>

    </div>
  )
}
