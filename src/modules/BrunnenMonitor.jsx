// src/modules/BrunnenMonitor.jsx
// Brunnen-Monitoring als Modul in Mepromas Cloud (kein separates Deployment)
// Route z.B.: <Route path="/brunnen" element={<BrunnenMonitor/>} />
import { useEffect, useState } from 'react'
import { supabaseBrunnen } from '../lib/supabaseBrunnen'

export default function BrunnenMonitor() {
  const [messwerte, setMesswerte] = useState([])
  const [status, setStatus] = useState(null)
  const [fehler, setFehler] = useState('')

  async function laden() {
    if (!supabaseBrunnen) {
      setFehler('Brunnen-Projekt nicht konfiguriert: VITE_BRUNNEN_SUPABASE_URL / VITE_BRUNNEN_SUPABASE_ANON_KEY fehlen in .env.')
      return
    }
    // Letzte 60 Messwerte (10s-Takt = 10 Minuten)
    const { data: mw, error: e1 } = await supabaseBrunnen
      .from('brunnen_messwerte')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60)
    if (e1) { setFehler(e1.message); return }
    setMesswerte(mw ?? [])

    // Aktueller Status (Heartbeat)
    const { data: st } = await supabaseBrunnen
      .from('brunnen_status')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
    setStatus(st?.[0] ?? null)
  }

  async function befehlSenden(befehl) {
    if (!supabaseBrunnen) return
    // Agent pollt brunnen_befehle alle 2s
    const { error } = await supabaseBrunnen
      .from('brunnen_befehle')
      .insert({ befehl, status: 'neu' })
    if (error) setFehler(error.message)
  }

  useEffect(() => {
    laden()
    if (!supabaseBrunnen) return
    const t = setInterval(laden, 10000) // Aktualisierung alle 10s
    return () => clearInterval(t)
  }, [])

  const online = status &&
    (Date.now() - new Date(status.updated_at).getTime()) < 60000
  const neuester = messwerte[0]

  return (
    <div style={{ padding: 16 }}>
      <h2>Brunnen-Monitoring – Mélac-Häusle</h2>
      <p>Agent: {online ? '🟢 online' : '🔴 offline'}
         {status && ` (letzter Heartbeat: ${new Date(status.updated_at).toLocaleTimeString('de-DE')})`}</p>
      {fehler && <p style={{ color: 'red' }}>Fehler: {fehler}</p>}
      {neuester && (
        <ul>
          <li>Spannung: {neuester.spannung} V</li>
          <li>Strom: {neuester.strom} A</li>
          <li>Leistung: {neuester.leistung} W</li>
          <li>Temperatur: {neuester.temperatur} °C</li>
          <li>Luftfeuchte: {neuester.luftfeuchte} %</li>
        </ul>
      )}
      <button disabled={!supabaseBrunnen} onClick={() => befehlSenden('relais_ein')}>Relais EIN</button>{' '}
      <button disabled={!supabaseBrunnen} onClick={() => befehlSenden('relais_aus')}>Relais AUS</button>
      {/* TODO: Diagramm (recharts) über messwerte-Array */}
    </div>
  )
}
