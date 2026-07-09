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
      admin:           ['view_all','add_project','delete_project','edit_core','update_phase','update_status','import','export','manage_users','view_history','assign_project','manage_settings'],
      department_head: ['view_all','add_project','delete_project','edit_core','update_phase','update_status','export','manage_users','view_history'],
      division_head:   ['view_all','add_project','edit_core','update_phase','update_status','export','view_history'],
      section_head:    ['view_all','add_project','edit_core','update_phase','update_status','export','view_history'],
      pic:             ['view_all','update_phase','update_status','export','view_history'],
      viewer:          ['view_all','export'],
    }
    return (PERMS[user.role] || []).includes(action)
  }, [user])

  const getRoleLabel = (role) => ({
    admin: 'Admin',
    department_head: 'Department Head',
    division_head: 'Division Head',
    section_head: 'Section Head',
    pic: 'Person In Charge (PIC)',
    viewer: 'Viewer',
  }[role] || role)

  return (
    <AuthContext.Provider value={{ user, login, logout, can, getRoleLabel }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
