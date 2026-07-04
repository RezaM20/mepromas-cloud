import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Database, FileText, AlertTriangle, CheckCircle, Plus, QrCode, Clock } from 'lucide-react'

function tageBis(datum) {
  if (!datum) return null
  const heute = new Date(); heute.setHours(0,0,0,0)
  const ziel = new Date(datum)
  return Math.round((ziel - heute) / 86400000)
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const istKunde = profile?.rolle === 'kunde'
  const [stats, setStats] = useState({ anlagen: 0, protokolle: 0, ueberfaellig: 0, bald_faellig: 0, bestanden: 0, nicht_bestanden: 0 })
  const [recent, setRecent] = useState([])
  const [faelligkeiten, setFaelligkeiten] = useState([])

  useEffect(() => {
    if (!user) return
    loadStats()
    loadRecent()
    loadFaelligkeiten()
  }, [user])

  async function loadStats() {
    // Kein expliziter user_id-Filter mehr — RLS liefert eigene UND
    // per Freigabe geteilte Datensätze (siehe supabase_setup_c3.sql)
    const [a, p] = await Promise.all([
      supabase.from('anlagen').select('id', { count: 'exact' }),
      supabase.from('protokolle').select('ergebnis, frist')
    ])
    const heute = new Date().toISOString().slice(0,10)
    const in30Tagen = new Date(Date.now() + 30*86400000).toISOString().slice(0,10)
    const prots = p.data || []
    setStats({
      anlagen: a.count || 0,
      protokolle: prots.length,
      ueberfaellig: prots.filter(pr => pr.frist && pr.frist < heute).length,
      bald_faellig: prots.filter(pr => pr.frist && pr.frist >= heute && pr.frist <= in30Tagen).length,
      bestanden: prots.filter(pr => pr.ergebnis === 'ok').length,
      nicht_bestanden: prots.filter(pr => pr.ergebnis === 'nichtok').length,
    })
  }

  async function loadRecent() {
    const { data } = await supabase.from('protokolle')
      .select('id, datum, ergebnis, kind, anlagen(name)')
      .order('created_at', { ascending: false })
      .limit(5)
    setRecent(data || [])
  }

  async function loadFaelligkeiten() {
    // Jeweils die neueste Prüfung pro Anlage, sortiert nach nächster Fälligkeit.
    // Anzeige der nächsten 8 fälligen/bald fälligen Termine (überfällig zuerst).
    const { data } = await supabase.from('protokolle')
      .select('id, frist, kind, anlagen(id, name, anlagen_id)')
      .not('frist', 'is', null)
      .order('frist', { ascending: true })
      .limit(8)
    setFaelligkeiten(data || [])
  }

  const statCards = [
    { label: t('dashboard.total_anlagen'),    value: stats.anlagen,        icon: Database,       color: 'text-blue-600',  bg: 'bg-blue-50' },
    { label: t('dashboard.total_protokolle'), value: stats.protokolle,     icon: FileText,       color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Überfällig',                     value: stats.ueberfaellig,   icon: AlertTriangle,  color: 'text-red-600',   bg: 'bg-red-50' },
    { label: 'Bald fällig (30 Tage)',          value: stats.bald_faellig,   icon: Clock,          color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  const ergBadge = erg => erg==='ok' ? 'success' : erg==='nichtok' ? 'danger' : 'warning'
  const ergLabel = erg => erg==='ok' ? t('protokoll.bestanden') : erg==='nichtok' ? t('protokoll.nicht_bestanden') : '–'

  function faelligkeitBadge(frist) {
    const tage = tageBis(frist)
    if (tage < 0) return { variant: 'danger', text: `${Math.abs(tage)} Tage überfällig` }
    if (tage <= 30) return { variant: 'warning', text: `in ${tage} Tagen` }
    return { variant: 'default', text: frist }
  }

  return (
    <div className="space-y-6">
      {/* Begrüßung */}
      <div>
        <h1 className="text-2xl font-black text-[#1E3A5F]">
          {t('dashboard.welcome')}, {profile?.name?.split(' ')[0] || ''}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Mepromas Cloud — {t('app.tagline')}</p>
      </div>

      {/* Stat-Karten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bg}`}>
              <Icon size={22} className={color} />
            </div>
            <div>
              <div className="text-2xl font-black text-[#1E3A5F]">{value}</div>
              <div className="text-xs text-gray-500 font-medium">{label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Fälligkeitsmanagement */}
        <Card>
          <CardHeader title="Anstehende Prüfungen" subtitle="Nach Fälligkeit sortiert, überfällig zuerst" />
          {faelligkeiten.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">Keine anstehenden Fälligkeiten.</p>
            : <div className="space-y-2">
                {faelligkeiten.map(p => {
                  const b = faelligkeitBadge(p.frist)
                  return (
                    <Link key={p.id} to={`/protokoll/${p.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition border border-gray-100">
                      <div>
                        <div className="text-sm font-semibold text-[#1E3A5F]">{p.anlagen?.name || '–'}</div>
                        <div className="text-xs text-gray-400">{p.kind} · {p.frist}</div>
                      </div>
                      <Badge variant={b.variant}>{b.text}</Badge>
                    </Link>
                  )
                })}
              </div>
          }
        </Card>

        {/* Letzte Protokolle */}
        <Card>
          <CardHeader title={t('dashboard.recent_protokolle')}
            action={<Link to="/protokolle" className="text-xs text-blue-600 hover:underline font-medium">Alle →</Link>} />
          {recent.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">{t('protokoll.no_protokolle')}</p>
            : <div className="space-y-2">
                {recent.map(p => (
                  <Link key={p.id} to={`/protokoll/${p.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition border border-gray-100">
                    <div>
                      <div className="text-sm font-semibold text-[#1E3A5F]">{p.anlagen?.name || '–'}</div>
                      <div className="text-xs text-gray-400">{p.datum} · {p.kind}</div>
                    </div>
                    <Badge variant={ergBadge(p.ergebnis)}>{ergLabel(p.ergebnis)}</Badge>
                  </Link>
                ))}
              </div>
          }
        </Card>
      </div>

      {!istKunde && (
        <Card>
          <CardHeader title={t('dashboard.quick_actions')} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Link to="/anlagen/neu">
              <Button variant="primary" className="w-full gap-2"><Plus size={16}/>{t('anlagen.new')}</Button>
            </Link>
            <Link to="/protokolle/neu">
              <Button variant="success" className="w-full gap-2"><FileText size={16}/>{t('protokoll.new')}</Button>
            </Link>
            <Link to="/codes">
              <Button variant="ghost" className="w-full gap-2"><QrCode size={16}/>Codes</Button>
            </Link>
            <Link to="/anlagen">
              <Button variant="ghost" className="w-full gap-2"><Database size={16}/>{t('nav.anlagen')}</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
