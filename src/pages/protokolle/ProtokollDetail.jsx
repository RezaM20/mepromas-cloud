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

export default function ProtokollDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { if (user && id) load() }, [user, id])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('protokolle')
      .select('*, anlagen(name, anlagen_id, standort, norm, intervall)')
      .eq('id', id).eq('user_id', user.id).single()
    if (error) setError(error.message)
    setP(data)
    setLoading(false)
  }

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

    // Prüfschritte / Messwerte
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

    const dateiname = `Protokoll_${(a.anlagen_id || a.name || 'Anlage').replace(/[^a-zA-Z0-9_-]/g,'_')}_${p.datum}.pdf`
    doc.save(dateiname)
  }

  const ergBadge = e => e==='ok'?'success':e==='nichtok'?'danger':'warning'
  const ergLabel = e => e==='ok'?t('protokoll.bestanden'):e==='nichtok'?t('protokoll.nicht_bestanden'):'Mängel'

  if (loading) return <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
  if (error || !p) return <Card className="text-center py-12 text-gray-400">{error || 'Protokoll nicht gefunden.'}</Card>

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={()=>navigate(-1)} className="text-sm text-blue-600 hover:underline">← {t('common.back')}</button>
          <h1 className="text-2xl font-black text-[#1E3A5F] mt-1">{p.kind}</h1>
        </div>
        <Badge variant={ergBadge(p.ergebnis)}>{ergLabel(p.ergebnis)}</Badge>
      </div>

      <Card>
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
                    const angezeigt = feld.type === 'checkbox' ? (wert ? '✓ OK' : '–') : (wert !== '' && wert != null ? `${wert}${feld.unit ? ' '+feld.unit : ''}` : '–')
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

      <div className="flex gap-3">
        <Button onClick={exportPdf} variant="success" className="gap-2">📄 {t('protokoll.pdf')}</Button>
        <Link to={`/anlagen/${p.anlage_id}`}><Button variant="ghost">Zur Anlage</Button></Link>
      </div>
    </div>
  )
}
