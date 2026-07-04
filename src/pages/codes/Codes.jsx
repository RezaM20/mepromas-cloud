import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'

// Avery L4718REV-20: 70x37mm, 3 Etiketten pro Zeile, 8 Zeilen pro A4-Blatt
const LABEL_W = 70
const LABEL_H = 37

export default function Codes() {
  const { user } = useAuth()
  const [anlagen, setAnlagen] = useState([])
  const [form, setForm] = useState({ id: '', name: '', standort: '', norm: 'VDE 0105-100' })
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const barcodeRef = useRef(null)

  useEffect(() => {
    if (user) supabase.from('anlagen').select('id, name, anlagen_id, standort, norm').eq('user_id', user.id)
      .then(({ data }) => setAnlagen(data || []))
  }, [user])

  async function erzeugen() {
    setError('')
    if (!form.id) { setError('Bitte Anlagen-ID eingeben.'); return }
    try {
      // QR-Code: vollständiger Datensatz (Bearbeiten-Modus, wie in der PWA)
      const payload = JSON.stringify({
        sys: 'mepromas', id: form.id, name: form.name,
        standort: form.standort, norm: form.norm,
        url: 'https://mepromasapp.netlify.app'
      })
      const url = await QRCode.toDataURL(payload, { width: 240, margin: 1, errorCorrectionLevel: 'M' })
      setQrDataUrl(url)

      // Barcode (Code-128): nur die Anlagen-ID (Prüfung-starten-Modus, wie in der PWA)
      if (barcodeRef.current) {
        JsBarcode(barcodeRef.current, form.id, {
          format: 'CODE128', width: 2, height: 50, displayValue: true, fontSize: 13, margin: 4
        })
      }
    } catch (e) {
      setError('Fehler bei der Code-Erzeugung: ' + e.message)
    }
  }

  function ausAnlageWaehlen(a) {
    setForm({ id: a.anlagen_id || a.id, name: a.name, standort: a.standort || '', norm: a.norm || 'VDE 0105-100' })
    setQ('')
  }

  function etikettDrucken() {
    window.print()
  }

  const gefiltert = anlagen.filter(a => q && [a.name, a.anlagen_id].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-black text-[#1E3A5F] no-print">Code-Generator</h1>

      <Card className="no-print">
        <CardHeader title="Anlagen-Stammaufkleber erzeugen" subtitle="QR-Code (Daten bearbeiten) + Strichcode Code-128 (Prüfung starten) — Avery L4718REV-20, 70×37mm" />
        <div className="space-y-4">
          <div className="relative">
            <Input label="Aus Anlagendatenbank laden" value={q} onChange={e=>setQ(e.target.value)} placeholder="Anlage suchen…" />
            {gefiltert.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg">
                {gefiltert.map(a => (
                  <button key={a.id} onClick={()=>ausAnlageWaehlen(a)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <b>{a.anlagen_id}</b> · {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Anlagen-ID *" value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value}))} placeholder="ESS-2024-0042" />
            <Input label="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Pumpenstation…" />
            <Input label="Standort" value={form.standort} onChange={e=>setForm(f=>({...f,standort:e.target.value}))} placeholder="Adresse…" />
            <Select label="Norm" value={form.norm} onChange={e=>setForm(f=>({...f,norm:e.target.value}))}>
              {['VDE 0105-100','VDE 0100-600','VDE 0701-0702','VDE 0100-702'].map(n=><option key={n} value={n}>{n}</option>)}
            </Select>
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
          <Button onClick={erzeugen} className="gap-2">🔄 Codes erzeugen</Button>
        </div>
      </Card>

      {qrDataUrl && (
        <>
          <Card className="no-print">
            <CardHeader title="Vorschau" />
            <div className="flex items-start gap-6">
              <div>
                <div className="text-xs text-gray-500 mb-2 font-medium">QR-Code (Daten bearbeiten)</div>
                <img src={qrDataUrl} alt="QR-Code" className="border border-gray-200 rounded-lg" width={140} height={140} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2 font-medium">Strichcode (Prüfung starten)</div>
                <svg ref={barcodeRef} className="border border-gray-200 rounded-lg bg-white" />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={etikettDrucken} variant="success" className="gap-2">🖨️ Etikett drucken (Avery 70×37mm)</Button>
            </div>
          </Card>

          {/* Druckbares Etikett — wird nur beim Drucken sichtbar (siehe @media print) */}
          <div className="print-label" style={{ width: `${LABEL_W}mm`, height: `${LABEL_H}mm` }}>
            <div className="print-label-inner">
              <div className="pl-header">
                <span className="pl-title">{form.name || 'Mepromas'}</span>
                <span className={`pl-badge ${form.norm ? 'pl-badge-ok' : ''}`}>{form.norm}</span>
              </div>
              <div className="pl-body">
                <img src={qrDataUrl} alt="QR" className="pl-qr" />
                <div className="pl-meta">
                  <div className="pl-id">{form.id}</div>
                  <div className="pl-standort">{form.standort}</div>
                </div>
              </div>
              <div className="pl-barcode-wrap">
                <svg ref={(el)=>{ if(el && form.id){ try{ JsBarcode(el, form.id, {format:'CODE128', width:1.2, height:22, displayValue:true, fontSize:9, margin:0}) }catch{} } }} />
              </div>
              <div className="pl-footer">Stadt Esslingen · Mepromas</div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media screen {
          .print-label { display: none; }
        }
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .print-label, .print-label * { visibility: visible; }
          .print-label {
            display: block; position: absolute; top: 0; left: 0;
            border: 1px dashed #999;
          }
          .print-label-inner { width: 100%; height: 100%; padding: 2mm; box-sizing: border-box; font-family: Arial, sans-serif; }
          .pl-header { display: flex; justify-content: space-between; align-items: center; }
          .pl-title { font-size: 9px; font-weight: bold; color: #1E3A5F; }
          .pl-badge { font-size: 7px; padding: 1px 4px; border-radius: 3px; background: #e5e7eb; }
          .pl-body { display: flex; gap: 2mm; margin-top: 1mm; }
          .pl-qr { width: 16mm; height: 16mm; }
          .pl-meta { font-size: 8px; }
          .pl-id { font-weight: bold; }
          .pl-standort { color: #555; }
          .pl-barcode-wrap { margin-top: 1mm; }
          .pl-footer { font-size: 6px; color: #888; text-align: right; }
        }
      `}</style>
    </div>
  )
}
