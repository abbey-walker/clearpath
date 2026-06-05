import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import NewCheck from './pages/NewCheck'
import Report from './pages/Report'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  return localStorage.getItem('clearpath_auth')
    ? children
    : <Navigate to="/login" replace />
}

export default function App() {
  const isAuthed = !!localStorage.getItem('clearpath_auth')

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={isAuthed ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={isAuthed ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={isAuthed ? <Navigate to="/dashboard" replace /> : <Signup />} />

      {/* Protected app */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="checks/new" element={<NewCheck />} />
        <Route path="checks/:checkId" element={<Report />} />
      </Route>

      <Route path="*" element={<Navigate to={isAuthed ? '/dashboard' : '/'} replace />} />
    </Routes>
  )
}
