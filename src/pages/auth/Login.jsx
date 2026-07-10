import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Zap } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'

// Cloudflare Turnstile Site Key (öffentlich, analog zum Supabase-Anon-Key).
// Muss in .env als VITE_TURNSTILE_SITE_KEY gesetzt sein — sonst kann die
// Sicherheitsabfrage nicht angezeigt werden und Login/Register bleiben
// gesperrt (Supabase verlangt server-seitig einen captcha_token).
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export default function Login() {
  const { t, i18n } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const turnstileRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!captchaToken) {
      setError('Bitte Sicherheitsabfrage bestätigen, bevor du dich anmeldest.')
      return
    }

    setLoading(true)
    const { error } = await signIn(form.email, form.password, captchaToken)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Zap size={32} className="text-[#2563EB]" />
          </div>
          <h1 className="text-2xl font-black text-white">MEPROMAS CLOUD</h1>
          <p className="text-blue-200 text-sm mt-1">{t('app.tagline')}</p>
        </div>

        {/* Formular */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-1">{t('auth.login_title')}</h2>
          <p className="text-sm text-gray-500 mb-6">{t('auth.login_subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label={t('auth.email')} id="email" type="email" required
              value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))}
              placeholder="reza@esslingen.de" />
            <Input label={t('auth.password')} id="password" type="password" required
              value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))}
              placeholder="••••••••" />

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
                ⚠️ VITE_TURNSTILE_SITE_KEY ist nicht konfiguriert — Anmeldung nicht möglich.
              </div>
            )}

            {error && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

            <Button type="submit" size="lg" disabled={loading || !captchaToken} className="w-full mt-2">
              {loading ? t('auth.logging_in') : t('auth.login')}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {t('auth.no_account')}{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </div>

        {/* Sprachumschalter */}
        <div className="flex justify-center gap-3 mt-5">
          {['de','en'].map(lng => (
            <button key={lng} onClick={() => { i18n.changeLanguage(lng); localStorage.setItem('mepromas_lang',lng) }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition ${i18n.language===lng ? 'bg-white text-[#1E3A5F]' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              {lng}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
