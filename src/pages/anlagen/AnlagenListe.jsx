import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Plus, Search, ChevronRight, Trash2 } from 'lucide-react'

export default function AnlagenListe() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const istKunde = profile?.rolle === 'kunde'
  const [anlagen, setAnlagen] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    // Kein expliziter user_id-Filter mehr — RLS liefert eigene UND
    // per Freigabe geteilte Anlagen (siehe supabase_setup_c3.sql)
    const { data } = await supabase.from('anlagen').select('*').order('created_at', { ascending: false })
    setAnlagen(data || [])
    setLoading(false)
  }

  async function del(id) {
    if (!confirm(t('common.confirm_delete'))) return
    await supabase.from('anlagen').delete().eq('id', id)
    setAnlagen(a => a.filter(x => x.id !== id))
  }

  const gefiltert = anlagen.filter(a =>
    !q || [a.name, a.anlagen_id, a.standort].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1E3A5F]">{t('anlagen.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{anlagen.length} gesamt</p>
        </div>
        {!istKunde && <Link to="/anlagen/neu"><Button className="gap-2"><Plus size={16}/>{t('anlagen.new')}</Button></Link>}
      </div>
      {istKunde && (
        <div className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
          Sie sehen die Ihnen freigegebenen Anlagen im Lesemodus.
        </div>
      )}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('anlagen.search')}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        : gefiltert.length === 0
          ? <Card className="text-center py-12">
              <p className="text-gray-400 mb-4">{istKunde ? 'Ihnen wurden noch keine Anlagen freigegeben.' : t('anlagen.no_anlagen')}</p>
              {!istKunde && <Link to="/anlagen/neu"><Button className="gap-2"><Plus size={16}/>{t('anlagen.create_first')}</Button></Link>}
            </Card>
          : <div className="space-y-2">
              {gefiltert.map(a => (
                <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-blue-300 transition">
                  <Badge variant={a.art||'info'}>{a.art||'anlage'}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#1E3A5F] truncate">{a.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {a.anlagen_id && <span className="mr-2">ID: {a.anlagen_id}</span>}
                      {a.standort && <span>{a.standort}</span>}
                    </div>
                    <div className="text-xs text-gray-400">{a.norm}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!istKunde && (
                      <Link to={`/protokolle/neu?anlage=${a.id}`}>
                        <Button size="sm" variant="success" className="text-xs">▶ {t('anlagen.pruefung_starten')}</Button>
                      </Link>
                    )}
                    <Link to={`/anlagen/${a.id}`}>
                      <Button size="sm" variant="ghost"><ChevronRight size={16}/></Button>
                    </Link>
                    {!istKunde && (
                      <button onClick={()=>del(a.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition">
                        <Trash2 size={15}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
      }
    </div>
  )
}