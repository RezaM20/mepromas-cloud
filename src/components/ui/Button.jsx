export function Button({ children, onClick, type='button', variant='primary', size='md', disabled, className='' }) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary:   'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 focus:ring-gray-300',
    danger:    'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    success:   'bg-green-700 hover:bg-green-800 text-white focus:ring-green-500',
    ghost:     'bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300 focus:ring-gray-300',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${variants[variant]||variants.primary} ${sizes[size]||sizes.md} ${className}`}>
      {children}
    </button>
  )
}
