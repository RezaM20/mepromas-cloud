import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Zap } from 'lucide-react'

export default function Login() {
  const { t, i18n } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await signIn(form.email, form.password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/dashboard')
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

            {error && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

            <Button type="submit" size="lg" disabled={loading} className="w-full mt-2">
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
