import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
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
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="checks/new" element={<NewCheck />} />
        <Route path="checks/:checkId" element={<Report />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
