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

  const updateProfileContext = useCallback((updates) => {
    setUser(prev => {
      if (!prev) return prev
      const newUser = { ...prev, ...updates }
      const s = sessionStorage.getItem('pmo_session')
      if (s) {
        const parsed = JSON.parse(s)
        parsed.user = newUser
        sessionStorage.setItem('pmo_session', JSON.stringify(parsed))
      }
      return newUser
    })
  }, [])

  const can = useCallback((action) => {
    if (!user) return false
    const PERMS = {
      admin:  ['view_all','add_project','delete_project','edit_core','update_phase','update_status','import','export','manage_users','view_history','assign_project','manage_settings'],
      dpm:    ['view_all','add_project','edit_core','update_phase','update_status','import','export','manage_users','view_history'],
      sic:    ['view_all','add_project','edit_core','update_phase','update_status','import','export','view_history'],
      tl:     ['view_all','add_project','edit_core','update_phase','update_status','import','export','view_history'],
      pic:    ['view_all','add_project','edit_core','update_phase','update_status','import','export','view_history'],
      viewer: ['view_all','export'],
    }
    return (PERMS[user.role] || []).includes(action)
  }, [user])

  const getRoleLabel = (role) => {
    return {
      admin: 'Admin',
      dpm: 'Department Project Manager (DPM)',
      sic: 'Section In Charge (SIC)',
      tl: 'Team Lead (TL)',
      pic: 'Person In Charge (PIC)',
      viewer: 'Viewer',
    }[role] || role
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, can, getRoleLabel, updateProfileContext }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
