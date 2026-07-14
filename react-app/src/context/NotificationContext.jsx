import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'

const NotifContext = createContext({})

export function NotificationProvider({ children }) {
  const { user }    = useAuth()
  const [items,   setItems]   = useState([])
  const [count,   setCount]   = useState(0)
  const [loading, setLoading] = useState(false)

  const getToken = () => {
    try { return JSON.parse(sessionStorage.getItem('pmo_session') || '{}').token || '' } catch { return '' }
  }

  const authCfg = () => ({ headers: { Authorization: `Bearer ${getToken()}` } })

  const fetchCount = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await axios.get('/api/notifications/count', authCfg())
      setCount(data.count || 0)
    } catch {}
  }, [user])

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await axios.get('/api/notifications', authCfg())
      setItems(data || [])
      setCount((data || []).filter(n => n.isUnread).length)
    } catch {}
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { fetchCount() }, [fetchCount])

  // Listen to SSE for new notifications
  useEffect(() => {
    if (!user) return
    const token = getToken()
    const es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`)
    es.addEventListener('notification_new',     () => fetchCount())
    es.addEventListener('notification_updated', () => fetchAll())
    return () => es.close()
  }, [user])

  async function sendApproval({ title, body, to_users, cc_users, project_id, project_name, priority, changes_json }) {
    const { data } = await axios.post('/api/notifications', {
      type: 'approval_request', title, body, to_users, cc_users,
      project_id, project_name, priority, changes_json,
    }, authCfg())
    fetchCount()
    return data
  }

  async function markRead(id) {
    await axios.patch(`/api/notifications/${id}`, { action: 'read' }, authCfg())
    setItems(prev => prev.map(n => n.id === id ? { ...n, isUnread: false } : n))
    setCount(prev => Math.max(0, prev - 1))
  }

  async function markAllRead() {
    const unread = items.filter(n => n.isUnread)
    await Promise.all(unread.map(n => axios.patch(`/api/notifications/${n.id}`, { action: 'read' }, authCfg())))
    setItems(prev => prev.map(n => ({ ...n, isUnread: false })))
    setCount(0)
  }

  async function approveOrReject(id, action) {
    const { data } = await axios.patch(`/api/notifications/${id}`, { action }, authCfg())
    setItems(prev => prev.map(n => n.id === id ? { ...n, ...data, isUnread: false } : n))
    fetchCount()
  }

  async function approveEditRequest(notificationId, projectId, action) {
    if (action === 'approve') {
      await axios.put(`/api/projects/${projectId}/approve_edit`, { notificationId }, authCfg())
    } else {
      await axios.patch(`/api/notifications/${notificationId}`, { action: 'reject' }, authCfg())
    }
    setItems(prev => prev.map(n => n.id === notificationId ? { ...n, status: action === 'approve' ? 'approved' : 'rejected', isUnread: false } : n))
    fetchCount()
  }

  async function clearAll() {
    await axios.patch('/api/notifications/clear_all', {}, authCfg())
    setItems([])
    setCount(0)
  }

  return (
    <NotifContext.Provider value={{ items, count, loading, fetchAll, fetchCount, sendApproval, markRead, markAllRead, approveOrReject, approveEditRequest, clearAll }}>
      {children}
    </NotifContext.Provider>
  )
}

export const useNotifications = () => useContext(NotifContext)
