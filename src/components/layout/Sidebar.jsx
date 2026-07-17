import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Database, FileText, QrCode, Settings, Shield, LogOut, Droplet, BookOpen, Calculator, ExternalLink, ClipboardList } from 'lucide-react'
export function Sidebar({ onClose }) {
  const { t, i18n } = useTranslation()
  const { profile, signOut } = useAuth()
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/anlagen',   icon: Database,         label: t('nav.anlagen') },
    { to: '/protokolle',icon: FileText,          label: t('nav.protokolle') },
  ]
  if (profile?.rolle !== 'kunde') navItems.push({ to: '/codes', icon: QrCode, label: t('nav.codes') })
  navItems.push({ to: '/brunnen', icon: Droplet, label: t('nav.brunnen') })
  navItems.push({ to: '/normen', icon: BookOpen, label: t('nav.normen', 'Normen') })
  navItems.push({ to: '/rechner', icon: Calculator, label: t('nav.rechner', 'Rechner') })
  navItems.push({ to: '/anhang', icon: ClipboardList, label: t('nav.anhang', 'Anhang') })
  navItems.push({ to: '/einstellungen', icon: Settings, label: t('nav.einstellungen') })
  if (profile?.rolle === 'admin') navItems.push({ to: '/admin', icon: Shield, label: t('nav.admin') })
  return (
    <aside className="w-64 bg-[#1E3A5F] min-h-screen flex flex-col text-white">
      <div className="px-6 py-5 border-b border-blue-800">
        <div className="text-xl font-black tracking-tight">MEPROMAS</div>
        <div className="text-xs text-blue-300 mt-0.5">{t('app.tagline')}</div>
      </div>
      {profile && (
        <div className="px-6 py-4 border-b border-blue-800">
          <div className="text-sm font-semibold">{profile.name}</div>
          <div className="text-xs text-blue-300 mt-0.5">{profile.firma || '—'}</div>
          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-700 rounded font-medium capitalize">
            {profile.rolle}
          </span>
        </div>
      )}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-blue-600 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        <a href="https://mepromas.pages.dev" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-200 hover:bg-blue-800 hover:text-white transition-all">
          <ExternalLink size={18} />
          Mepromas Classic
        </a>
      </nav>
      <div className="px-4 py-4 border-t border-blue-800 space-y-2">
        <div className="flex gap-2">
          {['de','en'].map(lng => (
            <button key={lng} onClick={() => { i18n.changeLanguage(lng); localStorage.setItem('mepromas_lang',lng) }}
              className={`flex-1 py-1.5 rounded text-xs font-bold uppercase transition ${i18n.language===lng ? 'bg-blue-500 text-white' : 'bg-blue-900 text-blue-300 hover:bg-blue-700'}`}>
              {lng}
            </button>
          ))}
        </div>
        <button onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-300 hover:bg-red-800 hover:text-white transition">
          <LogOut size={16} /> {t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}
