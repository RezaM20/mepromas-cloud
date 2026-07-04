import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Trash2, Shield } from 'lucide-react'

export default function Admin() {
  const { user } = useAuth()
  const [anlagen, setAnlagen] = useState([])
  const [freigaben, setFreigaben] = useState([])
  const [form, setForm] = useState({ anlage_id: '', kunde_email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    const [{ data: a }, { data: f }] = await Promise.all([
      supabase.from('anlagen').select('id, name, anlagen_id').eq('user_id', user.id).order('name'),
      supabase.from('freigaben').select('*, anlagen(name, anlagen_id)').eq('erstellt_von', user.id).order('erstellt_am', { ascending: false })
    ])
    setAnlagen(a || [])
    setFreigaben(f || [])
  }

  async function freigabeErstellen(e) {
    e.preventDefault()
    setError('')
    if (!form.anlage_id || !form.kunde_email) { setError('Bitte Anlage und E-Mail angeben.'); return }
    setSaving(true)
    const { error } = await supabase.from('freigaben').insert({
      anlage_id: form.anlage_id, kunde_email: form.kunde_email.trim().toLowerCase(), erstellt_von: user.id
    })
    setSaving(false)
    if (error) setError(error.message)
    else { setForm({ anlage_id: '', kunde_email: '' }); load() }
  }

  async function freigabeLoeschen(id) {
    await supabase.from('freigaben').delete().eq('id', id)
    setFreigaben(f => f.filter(x => x.id !== id))
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Shield className="text-[#1E3A5F]" size={24} />
        <h1 className="text-2xl font-black text-[#1E3A5F]">Admin — Kundenzugang</h1>
      </div>
      <p className="text-sm text-gray-500">
        Geben Sie einer Kunden-E-Mail-Adresse Lesezugriff auf eine Anlage frei. Sobald
        sich der Kunde mit dieser E-Mail registriert und die Rolle <code>kunde</code> hat,
        sieht er die Anlage und ihre Protokolle im Lesemodus.
      </p>

      <Card>
        <CardHeader title="Neue Freigabe erstellen" />
        <form onSubmit={freigabeErstellen} className="space-y-4">
          <Select label="Anlage *" value={form.anlage_id} onChange={e=>setForm(f=>({...f,anlage_id:e.target.value}))}>
            <option value="">-- Anlage wählen --</option>
            {anlagen.map(a => <option key={a.id} value={a.id}>{a.name}{a.anlagen_id?' ('+a.anlagen_id+')':''}</option>)}
          </Select>
          <Input label="Kunden-E-Mail *" type="email" value={form.kunde_email}
            onChange={e=>setForm(f=>({...f,kunde_email:e.target.value}))} placeholder="kunde@firma.de" />
          {error && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
          <Button type="submit" disabled={saving}>{saving ? 'Speichert…' : 'Freigabe erstellen'}</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Aktive Freigaben" subtitle={`${freigaben.length} gesamt`} />
        {freigaben.length === 0
          ? <div className="text-center py-6 text-gray-400 text-sm">Noch keine Freigaben erstellt.</div>
          : <div className="space-y-2">
              {freigaben.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <div>
                    <div className="text-sm font-semibold text-[#1E3A5F]">{f.anlagen?.name || '–'}</div>
                    <div className="text-xs text-gray-500">{f.kunde_email}</div>
                  </div>
                  <button onClick={()=>freigabeLoeschen(f.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition">
                    <Trash2 size={15}/>
                  </button>
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  )
}
