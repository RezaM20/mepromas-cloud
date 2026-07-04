import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Plus, Search } from 'lucide-react'

export default function ProtokollListe() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const istKunde = profile?.rolle === 'kunde'
  const [protokolle, setProtokolle] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    // Kein expliziter user_id-Filter mehr — RLS liefert eigene UND
    // per Freigabe geteilte Protokolle (siehe supabase_setup_c3.sql)
    const { data } = await supabase.from('protokolle')
      .select('*, anlagen(name, anlagen_id)')
      .order('created_at', { ascending: false })
    setProtokolle(data || [])
    setLoading(false)
  }

  const gefiltert = protokolle.filter(p =>
    !q || [p.anlagen?.name, p.anlagen?.anlagen_id, p.datum, p.pruefer].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase())
  )

  const ergBadge = e => e==='ok'?'success':e==='nichtok'?'danger':'warning'
  const ergLabel = e => e==='ok'?t('protokoll.bestanden'):e==='nichtok'?t('protokoll.nicht_bestanden'):'–'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1E3A5F]">{t('protokoll.title')}</h1>
          <p className="text-sm text-gray-500">{protokolle.length} gesamt</p>
        </div>
        {!istKunde && <Link to="/protokolle/neu"><Button className="gap-2"><Plus size={16}/>{t('protokoll.new')}</Button></Link>}
      </div>
      {istKunde && (
        <div className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
          Sie sehen die Protokolle Ihrer freigegebenen Anlagen im Lesemodus.
        </div>
      )}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('common.search')}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        : gefiltert.length === 0
          ? <Card className="text-center py-12 text-gray-400">{t('protokoll.no_protokolle')}</Card>
          : <div className="space-y-2">
              {gefiltert.map(p => (
                <Link key={p.id} to={`/protokoll/${p.id}`}
                  className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#1E3A5F]">{p.anlagen?.name || '–'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {p.datum} · {p.pruefer} · {p.kind}
                      </div>
                      {p.frist && <div className="text-xs text-gray-400">Nächste Prüfung: {p.frist}</div>}
                    </div>
                    <Badge variant={ergBadge(p.ergebnis)}>{ergLabel(p.ergebnis)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
      }
    </div>
  )
}