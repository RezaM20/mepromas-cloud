import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n/index.js'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { supabase } from './lib/supabase'
import { syncWarteschlange } from './lib/offline'

// Service Worker: App-Shell offline verfügbar
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

// Offline-Warteschlange: bei App-Start und bei Netz-Rückkehr synchronisieren
syncWarteschlange(supabase)
window.addEventListener('online', () => syncWarteschlange(supabase))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
