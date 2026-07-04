import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/Dashboard'
import AnlagenListe from './pages/anlagen/AnlagenListe'
import AnlagNeu from './pages/anlagen/AnlagNeu'
import ProtokollListe from './pages/protokolle/ProtokollListe'
import ProtokollNeu from './pages/protokolle/ProtokollNeu'
import ProtokollDetail from './pages/protokolle/ProtokollDetail'
import Einstellungen from './pages/einstellungen/Einstellungen'
import Codes from './pages/codes/Codes'
import Admin from './pages/admin/Admin'
import { RoleRoute } from './components/auth/RoleRoute'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[#1E3A5F] flex items-center justify-center">
      <div className="text-white text-center">
        <div className="text-3xl font-black mb-2">MEPROMAS</div>
        <div className="text-blue-300 text-sm animate-pulse">Laden…</div>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Öffentliche Routen */}
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Geschützte Routen */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/anlagen"       element={<AnlagenListe />} />
          <Route path="/anlagen/neu"   element={<RoleRoute erlaubt={['admin','techniker']}><AnlagNeu /></RoleRoute>} />
          <Route path="/protokolle"    element={<ProtokollListe />} />
          <Route path="/protokolle/neu" element={<RoleRoute erlaubt={['admin','techniker']}><ProtokollNeu /></RoleRoute>} />
          <Route path="/protokoll/:id" element={<ProtokollDetail />} />
          <Route path="/codes"         element={<RoleRoute erlaubt={['admin','techniker']}><Codes /></RoleRoute>} />
          <Route path="/einstellungen" element={<Einstellungen />} />
          <Route path="/admin"         element={<RoleRoute erlaubt={['admin']}><Admin /></RoleRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
