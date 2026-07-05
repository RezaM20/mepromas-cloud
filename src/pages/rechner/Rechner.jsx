import { useState } from 'react'
import { Card, CardHeader } from '../../components/ui/Card'
import { berechneOhm, berechneKabelquerschnitt } from '../../lib/rechner'

function num(v) {
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? null : n
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
      {children}
    </button>
  )
}

function Feld({ label, value, onChange, unit, type = 'number', ...rest }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600 uppercase">{label}</label>
      <div className="relative">
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...rest} />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{unit}</span>}
      </div>
    </div>
  )
}

function OhmRechner() {
  const [art, setArt] = useState('ac1')
  const [u, setU] = useState(''), [i, setI] = useState(''), [r, setR] = useState(''), [p, setP] = useState('')
  const [cos, setCos] = useState('0.95')

  const ergebnis = berechneOhm({ U: num(u), I: num(i), R: num(r), P: num(p), cos: num(cos) || 1, art })

  return (
    <Card>
      <CardHeader title="Ohmsches Gesetz" subtitle="Mindestens zwei von U/I/R eingeben" />
      <div className="flex gap-2 mb-4">
        {[['dc','DC'],['ac1','AC 1~'],['ac3','AC 3~']].map(([v,l]) => (
          <TabButton key={v} active={art===v} onClick={()=>setArt(v)}>{l}</TabButton>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Feld label="Spannung U" unit="V" value={u} onChange={setU} />
        <Feld label="Strom I" unit="A" value={i} onChange={setI} />
        <Feld label="Widerstand R" unit="Ω" value={r} onChange={setR} />
        <Feld label="Leistung P" unit="W" value={p} onChange={setP} />
        {art !== 'dc' && <Feld label="cos φ" value={cos} onChange={setCos} step="0.01" min="0" max="1" />}
      </div>
      {ergebnis.fehler
        ? <div className="mt-4 text-sm text-gray-400">{ergebnis.fehler}</div>
        : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Spannung U</div><div className="text-lg font-bold">{ergebnis.U?.toFixed(2)} V</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Strom I</div><div className="text-lg font-bold">{ergebnis.I?.toFixed(3)} A</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Widerstand R</div><div className="text-lg font-bold">{ergebnis.R?.toFixed(2)} Ω</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Leistung P</div><div className="text-lg font-bold">{ergebnis.P?.toFixed(2)} W</div></div>
          </div>
        )}
    </Card>
  )
}

function KabelRechner() {
  const [netz, setNetz] = useState('1')
  const [modus, setModus] = useState('P')
  const [leistung, setLeistung] = useState(''), [strom, setStrom] = useState('')
  const [cos, setCos] = useState('0.95'), [laenge, setLaenge] = useState('')
  const [duMax, setDuMax] = useState('3'), [material, setMaterial] = useState('Cu')
  const [verlegeart, setVerlegeart] = useState('B2'), [temperatur, setTemperatur] = useState('30')
  const [haeufungAnzahl, setHaeufungAnzahl] = useState('1')

  const ergebnis = berechneKabelquerschnitt({
    netz, modus, leistung: num(leistung), strom: num(strom), cos: num(cos) || 1,
    laenge: num(laenge), duMax: num(duMax) || 3, material, verlegeart,
    temperatur: parseInt(temperatur), haeufungAnzahl: parseInt(haeufungAnzahl)
  })

  return (
    <Card>
      <CardHeader title="Kabelquerschnitt & Spannungsfall" subtitle="nach VDE 0100-430" />
      <div className="flex gap-2 mb-3">
        <TabButton active={netz==='1'} onClick={()=>setNetz('1')}>230 V (1~)</TabButton>
        <TabButton active={netz==='3'} onClick={()=>setNetz('3')}>400 V (3~)</TabButton>
      </div>
      <div className="flex gap-2 mb-4">
        <TabButton active={modus==='P'} onClick={()=>setModus('P')}>Leistung</TabButton>
        <TabButton active={modus==='I'} onClick={()=>setModus('I')}>Betriebsstrom</TabButton>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {modus === 'P'
          ? <Feld label="Leistung P" unit="W" value={leistung} onChange={setLeistung} />
          : <Feld label="Betriebsstrom" unit="A" value={strom} onChange={setStrom} />}
        <Feld label="cos φ" value={cos} onChange={setCos} step="0.01" min="0" max="1" />
        <Feld label="Länge (einfach)" unit="m" value={laenge} onChange={setLaenge} />
        <Feld label="max. Spannungsfall" unit="%" value={duMax} onChange={setDuMax} />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase">Material</label>
          <select value={material} onChange={e=>setMaterial(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="Cu">Kupfer (Cu)</option>
            <option value="Al">Aluminium (Al)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase">Verlegeart</label>
          <select value={verlegeart} onChange={e=>setVerlegeart(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {['A1','A2','B1','B2','C','E'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <Feld label="Umgebungstemperatur" unit="°C" value={temperatur} onChange={setTemperatur} />
        <Feld label="Häufung (Anzahl Stromkreise)" value={haeufungAnzahl} onChange={setHaeufungAnzahl} />
      </div>
      {ergebnis.fehler
        ? <div className="mt-4 text-sm text-gray-400">{ergebnis.fehler}</div>
        : (
          <>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Betriebsstrom I_B</div><div className="text-lg font-bold">{ergebnis.Ib.toFixed(2)} A</div></div>
              <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Sicherung I_n</div><div className="text-lg font-bold">{ergebnis.In} A</div></div>
              <div className="col-span-2 bg-amber-50 border border-amber-300 rounded-lg p-3">
                <div className="text-xs text-gray-500">Empfohlener Querschnitt</div>
                <div className="text-2xl font-black text-amber-700">{ergebnis.A} mm² {ergebnis.material}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Belastbarkeit I_z (korr.)</div><div className="text-lg font-bold">{ergebnis.Iz.toFixed(2)} A</div></div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Spannungsfall</div>
                <div className={`text-lg font-bold ${ergebnis.duPct > num(duMax) ? 'text-red-600' : 'text-green-600'}`}>{ergebnis.duPct.toFixed(2)} %</div>
              </div>
            </div>
            <div className={`mt-4 p-3 rounded-lg text-sm font-semibold ${ergebnis.okVDE ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-red-50 text-red-700 border border-red-300'}`}>
              {ergebnis.okVDE ? '✓ Schutz-Bedingung erfüllt (VDE 0100-430).' : '⚠ Bedingung nicht erfüllt — Querschnitt erhöhen.'}
              {' '}Maßgebend: <b>{ergebnis.limiter}</b>.
            </div>
          </>
        )}
    </Card>
  )
}

export default function Rechner() {
  const [tab, setTab] = useState('ohm')
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-[#1E3A5F] mb-4">Rechner</h1>
      <div className="flex gap-2 mb-5">
        <TabButton active={tab==='ohm'} onClick={()=>setTab('ohm')}>Ohmsches Gesetz</TabButton>
        <TabButton active={tab==='kabel'} onClick={()=>setTab('kabel')}>Kabelquerschnitt</TabButton>
      </div>
      {tab === 'ohm' ? <OhmRechner /> : <KabelRechner />}
    </div>
  )
}
