import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Sperrt eine Route für bestimmte Rollen. erlaubt = Array zulässiger Rollen.
// Beispiel: <RoleRoute erlaubt={['admin']}><Admin /></RoleRoute>
export function RoleRoute({ erlaubt, children }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/dashboard" replace />
  if (!erlaubt.includes(profile.rolle)) return <Navigate to="/dashboard" replace />
  return children
}
