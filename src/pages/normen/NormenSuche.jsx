import { useState } from 'react'
import normenDaten from '../../lib/normen-daten.json'
import { Search } from 'lucide-react'

export default function NormenSuche() {
  const [query, setQuery] = useState('')
  const ergebnisse = normenDaten.filter(n =>
    n.norm.toLowerCase().includes(query.toLowerCase()) ||
    n.titel.toLowerCase().includes(query.toLowerCase()) ||
    n.kategorie.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Normen-Suche</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Norm, Titel oder Kategorie suchen..."
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="space-y-3">
        {ergebnisse.map(n => (
          <div key={n.id} className="border rounded-lg p-4 hover:shadow-md transition">
            <div className="font-semibold text-blue-900">{n.norm}</div>
            <div className="text-sm text-gray-600 mt-1">{n.titel}</div>
            <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
              {n.kategorie}
            </span>
          </div>
        ))}
        {ergebnisse.length === 0 && (
          <div className="text-gray-500 text-center py-8">Keine Treffer.</div>
        )}
      </div>
    </div>
  )
}
