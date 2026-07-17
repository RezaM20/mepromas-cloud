import { useState } from 'react'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import pumpenDaten from '../../data/pumpen_daten.json'

function zuListe(daten) {
  return Object.entries(daten).map(([typ, werte]) => ({ id: crypto.randomUUID(), typ, ...werte }))
}

export default function Anhang() {
  const [pumpen, setPumpen] = useState(() => zuListe(pumpenDaten))
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState(null)

  function bearbeiten(row) {
    setEditId(row.id)
    setEditData({ ...row })
  }

  function abbrechen() {
    setEditId(null)
    setEditData(null)
  }

  function speichern() {
    setPumpen(liste => liste.map(p => p.id === editId ? {
      ...editData,
      P2_kW: parseFloat(editData.P2_kW) || 0,
      In_A: parseFloat(editData.In_A) || 0,
      Drehzahl: parseInt(editData.Drehzahl, 10) || 0,
    } : p))
    setEditId(null)
    setEditData(null)
  }

  function loeschen(id) {
    if (!confirm('Diesen Pumpentyp wirklich löschen?')) return
    setPumpen(liste => liste.filter(p => p.id !== id))
    if (editId === id) { setEditId(null); setEditData(null) }
  }

  function feld(name, value) {
    setEditData(d => ({ ...d, [name]: value }))
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-[#1E3A5F]">Anhang</h1>
        <p className="text-sm text-gray-500 mt-0.5">Technische Daten der Mastpumpen</p>
      </div>
      <Card>
        <CardHeader title="Mastpumpen (Typ K1–K5)" subtitle="Technische Daten zur Dokumentation" />
        {pumpen.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Keine Daten vorhanden</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3 font-semibold">Typ</th>
                  <th className="py-2 pr-3 font-semibold">P2 (kW)</th>
                  <th className="py-2 pr-3 font-semibold">In (A)</th>
                  <th className="py-2 pr-3 font-semibold">Schutzart</th>
                  <th className="py-2 pr-3 font-semibold">Drehzahl (1/min)</th>
                  <th className="py-2 pr-3 font-semibold text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {pumpen.map(row => {
                  const wirdBearbeitet = editId === row.id
                  return (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-3 font-semibold text-[#1E3A5F]">{row.typ}</td>
                      <td className="py-2 pr-3">
                        {wirdBearbeitet
                          ? <input type="number" step="0.01" value={editData.P2_kW}
                              onChange={e=>feld('P2_kW', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          : row.P2_kW}
                      </td>
                      <td className="py-2 pr-3">
                        {wirdBearbeitet
                          ? <input type="number" step="0.1" value={editData.In_A}
                              onChange={e=>feld('In_A', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          : row.In_A}
                      </td>
                      <td className="py-2 pr-3">
                        {wirdBearbeitet
                          ? <input type="text" value={editData.Schutzart}
                              onChange={e=>feld('Schutzart', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          : row.Schutzart}
                      </td>
                      <td className="py-2 pr-3">
                        {wirdBearbeitet
                          ? <input type="number" step="1" value={editData.Drehzahl}
                              onChange={e=>feld('Drehzahl', e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          : row.Drehzahl}
                      </td>
                      <td className="py-2 pr-1">
                        <div className="flex items-center justify-end gap-2">
                          {wirdBearbeitet ? (
                            <>
                              <Button size="sm" variant="success" className="gap-1" onClick={speichern}><Check size={14}/> Speichern</Button>
                              <Button size="sm" variant="ghost" className="gap-1" onClick={abbrechen}><X size={14}/> Abbrechen</Button>
                            </>
                          ) : (
                            <>
                              <button onClick={()=>bearbeiten(row)} title="Editieren"
                                className="p-1.5 text-gray-400 hover:text-blue-600 transition">
                                <Pencil size={15}/>
                              </button>
                              <button onClick={()=>loeschen(row.id)} title="Löschen"
                                className="p-1.5 text-gray-300 hover:text-red-500 transition">
                                <Trash2 size={15}/>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
