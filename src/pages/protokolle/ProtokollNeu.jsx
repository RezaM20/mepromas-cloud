import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { PRUEFSCHRITTE, leereDatenJson } from '../../lib/pruefschritte'
import { messwerteAusDatenJson, protokollBestanden } from '../../lib/bewertung'
import { speichernOderPuffern } from '../../lib/offline'
import { etikettenDrucken, etikettAusProtokoll } from '../../lib/etiketten'

export default function ProtokollNeu() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [anlagen, setAnlagen] = useState([])
  const [form, setForm] = useState({
    anlage_id: searchParams.get('anlage') || '',
    kind: 'VDE 0105-100',
    datum: new Date().toISOString().slice(0,10),
    pruefer: profile?.name || '',
    frist: '',
    intervall: '12',
    ergebnis: 'ok',
    bemerkung: '',
    daten_json: leereDatenJson('VDE 0105-100')
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) supabase.from('anlagen').select('id, name, anlagen_id, norm, intervall').eq('user_id', user.id)
      .then(({ data }) => setAnlagen(data || []))
  }, [user])

  useEffect(() => {
    if (form.datum && form.intervall) {
      const d = new Date(form.datum)
      d.setMonth(d.getMonth() + parseInt(form.intervall))
      setForm(f => ({...f, frist: d.toISOString().slice(0,10)}))
    }
  }, [form.datum, form.intervall])

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}))

  function kindWechseln(e) {
    const neuesKind = e.target.value
    setForm(p => ({ ...p, kind: neuesKind, daten_json: leereDatenJson(neuesKind) }))
  }

  function feldAendern(id, wert) {
    setForm(p => ({ ...p, daten_json: { ...p.daten_json, [id]: wert } }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.anlage_id) { setError('Bitte Anlage auswählen.'); return }
    setSaving(true)

    const protokollId = crypto.randomUUID()

    const bewertung = protokollBestanden(form.kind, form.daten_json)
    const ergebnis = bewertung === false ? 'mangel' : form.ergebnis

    const datensatz = { ...form, id: protokollId, ergebnis, user_id: user.id }
    const messwerte = messwerteAusDatenJson(form.kind, form.daten_json, protokollId, user.id)

    const { offline, error } = await speichernOderPuffern(supabase, 'protokolle', datensatz, messwerte)
    setSaving(false)
    if (error) { setError(error.message); return }
    if (offline) alert('Kein Netz — Protokoll lokal gespeichert und wird automatisch synchronisiert.')
    navigate('/protokolle')
  }

  const normDef = PRUEFSCHRITTE[form.kind]

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <button onClick={()=>navigate(-1)} className="text-sm text-blue-600 hover:underline">← {t('common.back')}</button>
        <h1 className="text-2xl font-black text-[#1E3A5F] mt-1">{t('protokoll.new')}</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader title={t('protokoll.new')} subtitle={normDef?.label} />
          <div className="space-y-4">
            <Select label="Anlage *" value={form.anlage_id} onChange={f('anlage_id')} required>
              <option value="">-- Anlage wählen --</option>
              {anlagen.map(a => <option key={a.id} value={a.id}>{a.name}{a.anlagen_id?' ('+a.anlagen_id+')':''}</option>)}
            </Select>
            <Select label={t('protokoll.typ')} value={form.kind} onChange={kindWechseln}>
              <option value="VDE 0105-100">{t('norms.vde_0105_100')}</option>
              <option value="VDE 0100-600">{t('norms.vde_0100_600')}</option>
              <option value="VDE 0701-0702">{t('norms.vde_0701_0702')}</option>
              <option value="VDE 0100-702">{t('norms.vde_0100_702')}</option>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <Input label={t('protokoll.datum')} type="date" value={form.datum} onChange={f('datum')} />
              <Select label={t('protokoll.intervall')} value={form.intervall} onChange={f('intervall')}>
                {['3','6','12','24','36','48'].map(v=><option key={v} value={v}>{t(`intervall.${v}`)}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label={t('protokoll.pruefer')} value={form.pruefer} onChange={f('pruefer')} />
              <Input label={t('protokoll.frist')} type="date" value={form.frist} onChange={f('frist')} />
            </div>
          </div>
        </Card>

        {normDef && normDef.gruppen.map(gruppe => (
          <Card key={gruppe.titel}>
            <CardHeader title={gruppe.titel} />
            <div className="space-y-3">
              {gruppe.felder.map(feld => (
                <div key={feld.id} className="flex items-center justify-between gap-3 py-1">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">{feld.label}</div>
                    {feld.grenzwert && <div className="text-xs text-gray-400">Grenzwert: {feld.grenzwert}</div>}
                  </div>
                  <div className="w-40 shrink-0">
                    {feld.type === 'checkbox' && (
                      <label className="flex items-center justify-end gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!form.daten_json[feld.id]}
                          onChange={e=>feldAendern(feld.id, e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      </label>
                    )}
                    {feld.type === 'number' && (
                      <div className="relative">
                        <input type="number" step="0.01" value={form.daten_json[feld.id] ?? ''}
                          onChange={e=>feldAendern(feld.id, e.target.value)}
                          className="w-full pl-3 pr-10 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        {feld.unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{feld.unit}</span>}
                      </div>
                    )}
                    {feld.type === 'select' && (
                      <select value={form.daten_json[feld.id] ?? ''} onChange={e=>feldAendern(feld.id, e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">–</option>
                        {feld.optionen.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        <Card>
          <CardHeader title="Gesamtergebnis" />
          <div className="space-y-4">
            <div className="flex gap-3">
              {[['ok','success','✓ '+t('protokoll.bestanden')],['nichtok','danger','✗ '+t('protokoll.nicht_bestanden')],['maengel','warning','⚠ Mängel']].map(([val,,lbl])=>(
                <button key={val} type="button" onClick={()=>setForm(p=>({...p,ergebnis:val}))}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition ${form.ergebnis===val
                    ? val==='ok'?'border-green-600 bg-green-50 text-green-700':val==='nichtok'?'border-red-600 bg-red-50 text-red-700':'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                  {lbl}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">{t('protokoll.bemerkung')}</label>
              <textarea value={form.bemerkung} onChange={f('bemerkung')} rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            {error && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            <div className="flex gap-3 pt-1">
              <Button type="submit" variant="success" disabled={saving}>{saving ? t('common.loading') : t('protokoll.save')}</Button>
              <Button variant="ghost" onClick={()=>navigate(-1)}>{t('common.cancel')}</Button>
              <Button type="button" variant="ghost" onClick={()=>{
                const anlage = anlagen.find(a=>a.id===form.anlage_id)
                etikettenDrucken([etikettAusProtokoll(form, anlage?.name)])
              }}>🏷️ Aufkleber drucken</Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  )
}