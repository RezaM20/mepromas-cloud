import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Zap } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'

// Cloudflare Turnstile Site Key — siehe Kommentar in Login.jsx.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export default function Register() {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name:'', email:'', firma:'', password:'', password2:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const turnstileRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.password2) { setError('Passwörter stimmen nicht überein.'); return }
    if (form.password.length < 6) { setError('Passwort mindestens 6 Zeichen.'); return }
    if (!captchaToken) { setError('Bitte Sicherheitsabfrage bestätigen, bevor du dich registrierst.'); return }

    setLoading(true)
    const { error } = await signUp(form.email, form.password, form.name, form.firma, captchaToken)
    setLoading(false)

    if (error) {
      setError(
        error.message?.toLowerCase().includes('captcha')
          ? 'Sicherheitsabfrage fehlgeschlagen oder abgelaufen. Bitte erneut versuchen.'
          : error.message
      )
      turnstileRef.current?.reset()
      setCaptchaToken('')
    } else {
      navigate('/dashboard')
    }
  }

  const f = (k) => e => setForm(prev => ({...prev, [k]: e.target.value}))

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Zap size={32} className="text-[#2563EB]" />
          </div>
          <h1 className="text-2xl font-black text-white">MEPROMAS CLOUD</h1>
          <p className="text-blue-200 text-sm mt-1">{t('app.tagline')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-1">{t('auth.register_title')}</h2>
          <p className="text-sm text-gray-500 mb-6">{t('auth.register_subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input label={t('auth.name')} type="text" required
              value={form.name} onChange={f('name')} placeholder="Mohammad Reza Mehdipour" />
            <Input label={t('auth.email')} type="email" required
              value={form.email} onChange={f('email')} placeholder="reza@esslingen.de" />
            <Input label={t('auth.firma')} type="text"
              value={form.firma} onChange={f('firma')} placeholder="Stadt Esslingen am Neckar" />
            <Input label={t('auth.password')} type="password" required
              value={form.password} onChange={f('password')} placeholder="min. 6 Zeichen" />
            <Input label={t('auth.password_confirm')} type="password" required
              value={form.password2} onChange={f('password2')} placeholder="Passwort wiederholen" />

            {TURNSTILE_SITE_KEY ? (
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={setCaptchaToken}
                onExpire={() => setCaptchaToken('')}
                onError={() => { setCaptchaToken(''); setError('Sicherheitsabfrage konnte nicht geladen werden.') }}
              />
            ) : (
              <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                ⚠️ VITE_TURNSTILE_SITE_KEY ist nicht konfiguriert — Registrierung nicht möglich.
              </div>
            )}

            {error && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

            <Button type="submit" size="lg" disabled={loading || !captchaToken} className="w-full mt-2">
              {loading ? t('auth.registering') : t('auth.register')}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {t('auth.has_account')}{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
