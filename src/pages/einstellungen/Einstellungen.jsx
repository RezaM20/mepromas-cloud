import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export default function Einstellungen() {
  const { t, i18n } = useTranslation()
  const { profile, user } = useAuth()
  const [form, setForm] = useState({ name: profile?.name||'', firma: profile?.firma||'' })
  const [saved, setSaved] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    await supabase.from('profiles').update({ name: form.name, firma: form.firma }).eq('id', user.id)
    setSaved(true)
    setTimeout(()=>setSaved(false), 2500)
  }

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-black text-[#1E3A5F]">{t('nav.einstellungen')}</h1>

      <Card>
        <CardHeader title="Profil" />
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={t('auth.name')} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          <Input label={t('auth.firma')} value={form.firma} onChange={e=>setForm(f=>({...f,firma:e.target.value}))} />
          <div className="flex items-center gap-3">
            <Button type="submit">{t('common.save')}</Button>
            {saved && <span className="text-sm text-green-600 font-medium">✓ {t('common.saved')}</span>}
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Sprache / Language" />
        <div className="flex gap-3">
          {[['de','🇩🇪 Deutsch'],['en','🇬🇧 English']].map(([lng,lbl])=>(
            <button key={lng} onClick={()=>{ i18n.changeLanguage(lng); localStorage.setItem('mepromas_lang',lng) }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition ${i18n.language===lng?'border-blue-600 bg-blue-50 text-blue-700':'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {lbl}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Konto" />
        <div className="text-sm text-gray-500 space-y-1">
          <div><b>E-Mail:</b> {user?.email}</div>
          <div><b>Rolle:</b> {profile?.rolle}</div>
          <div><b>ID:</b> <span className="font-mono text-xs">{user?.id?.slice(0,8)}…</span></div>
        </div>
      </Card>
    </div>
  )
}