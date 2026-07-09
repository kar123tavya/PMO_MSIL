import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }         from './context/AuthContext'
import { ProjectProvider }      from './context/ProjectContext'
import { ToastProvider }        from './context/ToastContext'
import { NotificationProvider } from './context/NotificationContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login     from './pages/Login'
import Dashboard from './pages/Dashboard'
import Flagship  from './pages/Flagship'
import Gantt     from './pages/Gantt'
import AuditLog  from './pages/AuditLog'
import Users     from './pages/Users'
import AIChatWidget from './components/AIChatWidget'
import AppTutorial from './components/AppTutorial'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ProjectProvider>
          <NotificationProvider>
            <AppTutorial />
            <Routes>
              <Route path="/login"    element={<Login />} />
              <Route path="/"         element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/flagship" element={<ProtectedRoute><Flagship /></ProtectedRoute>} />
              <Route path="/gantt"    element={<ProtectedRoute><Gantt /></ProtectedRoute>} />
              <Route path="/audit"    element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
              <Route path="/users"    element={<ProtectedRoute><Users /></ProtectedRoute>} />
              <Route path="*"         element={<Navigate to="/" replace />} />
            </Routes>
            <AIChatWidget />
          </NotificationProvider>
        </ProjectProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
