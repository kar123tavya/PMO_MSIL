import React, { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

function loadSession() {
  try {
    const s = sessionStorage.getItem('pmo_session')
    if (!s) return null
    const parsed = JSON.parse(s)
    return parsed.user || null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSession)

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    sessionStorage.setItem('pmo_session', JSON.stringify({ token: data.token, user: data.user }))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('pmo_session')
    setUser(null)
  }, [])

  const can = useCallback((action) => {
    if (!user) return false
    const PERMS = {
      senior_manager: ['view_all','add_project','delete_project','edit_core','update_phase','update_status','import','export','manage_users','view_history','assign_project','manage_settings'],
      section_head:   ['view_division','add_project','edit_core','update_phase','update_status','import','export','view_history'],
      deputy_manager: ['view_assigned','update_phase','update_status','export','view_history'],
      viewer:         ['view_all','export'],
    }
    return (PERMS[user.role] || []).includes(action)
  }, [user])

  const getRoleLabel = (role) => ({
    senior_manager: 'Senior Manager',
    section_head: 'Section Head',
    deputy_manager: 'Deputy Manager',
    viewer: 'Viewer',
  }[role] || role)

  return (
    <AuthContext.Provider value={{ user, login, logout, can, getRoleLabel }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
