import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { speichernOderPuffern } from '../../lib/offline'
import { Card, CardHeader } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export default function AnlagNeu() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name:'', anlagen_id:'', standort:'', norm:'vde_0105_100', intervall:'12', art:'anlage' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name) { setError('Name ist erforderlich.'); return }
    setSaving(true)
    const { offline, error } = await speichernOderPuffern(
      supabase, 'anlagen', { ...form, id: crypto.randomUUID(), user_id: user.id }
    )
    setSaving(false)
    if (error) { setError(error.message); return }
    if (offline) alert('Kein Netz — Anlage lokal gespeichert und wird automatisch synchronisiert.')
    navigate('/anlagen')
  }

  return (
    <div className="max-w-xl">
      <div className="mb-5">
        <button onClick={()=>navigate(-1)} className="text-sm text-blue-600 hover:underline">← {t('common.back')}</button>
        <h1 className="text-2xl font-black text-[#1E3A5F] mt-1">{t('anlagen.new')}</h1>
      </div>
      <Card>
        <CardHeader title={t('anlagen.new')} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t('anlagen.name')+' *'} value={form.name} onChange={f('name')} placeholder="Pumpenstation Mettingen" required />
          <Input label={t('anlagen.anlagen_id')} value={form.anlagen_id} onChange={f('anlagen_id')} placeholder="ESS-2024-0042" />
          <Input label={t('anlagen.standort')} value={form.standort} onChange={f('standort')} placeholder="Mettinger Str. 12, Esslingen" />
          <Select label={t('anlagen.art')} value={form.art} onChange={f('art')}>
            <option value="anlage">Anlage</option>
            <option value="geraet">Gerät</option>
            <option value="brunnen">Brunnenanlage</option>
          </Select>
          <Select label={t('anlagen.norm')} value={form.norm} onChange={f('norm')}>
            <option value="vde_0105_100">{t('norms.vde_0105_100')}</option>
            <option value="vde_0100_600">{t('norms.vde_0100_600')}</option>
            <option value="vde_0701_0702">{t('norms.vde_0701_0702')}</option>
            <option value="vde_0100_702">{t('norms.vde_0100_702')}</option>
          </Select>
          <Select label={t('anlagen.intervall')} value={form.intervall} onChange={f('intervall')}>
            {['3','6','12','24','36','48'].map(v=><option key={v} value={v}>{t(`intervall.${v}`)}</option>)}
          </Select>
          {error && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? t('common.loading') : t('anlagen.save')}</Button>
            <Button variant="ghost" onClick={()=>navigate(-1)}>{t('common.cancel')}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}