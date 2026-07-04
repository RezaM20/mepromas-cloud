export function Badge({ children, variant='default' }) {
  const v = {
    default: 'bg-gray-100 text-gray-700', success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800', warning: 'bg-amber-100 text-amber-800',
    info: 'bg-blue-100 text-blue-800', anlage: 'bg-blue-600 text-white',
    geraet: 'bg-purple-600 text-white', brunnen: 'bg-teal-600 text-white',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${v[variant]||v.default}`}>{children}</span>
}
