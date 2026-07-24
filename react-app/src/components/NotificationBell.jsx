import React, { useState, useEffect, useRef } from 'react'
import { useNotifications } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'

const PRIORITY_STYLE = {
  urgent: { border: '#dc2626', bg: '#fef2f2', dot: '#dc2626' },
  high:   { border: '#d97706', bg: '#fffbeb', dot: '#d97706' },
  normal: { border: '#e5e7eb', bg: '#fff', dot: '#9ca3af' },
}

const TYPE_ICON = {
  approval_request: '📋',
  deadline_alert:   '⏰',
  project_update:   '🔄',
  edit_approval:    '✏️',
}

const STATUS_LABEL = {
  pending:  { label: 'Pending',  bg: '#fffbeb', color: '#d97706' },
  approved: { label: 'Approved', bg: '#ecfdf5', color: '#059669' },
  rejected: { label: 'Rejected', bg: '#fef2f2', color: '#dc2626' },
  sent:     { label: 'Sent',     bg: '#eff6ff', color: '#2563eb' },
}

export default function NotificationBell() {
  const { count, items, loading, fetchAll, markRead, markAllRead, approveOrReject, approveEditRequest, clearAll } = useNotifications()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)

  useEffect(() => {
    if (open) fetchAll()
  }, [open])

  useEffect(() => {
    function outside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  function fmtTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d
    if (diff < 60000)  return 'just now'
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' })
  }

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', background: 'none', border: '1.5px solid var(--border)',
          borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', color: 'var(--text-muted)',
          background: open ? 'var(--surface-3)' : 'var(--surface)',
          transition: 'all .15s',
        }}
        title="Notifications"
      >
        🔔
        {count > 0 && (
          <span style={{
            position: 'absolute', top: '-6px', right: '-6px',
            background: '#dc2626', color: '#fff',
            borderRadius: '10px', fontSize: '.6rem', fontWeight: 800,
            minWidth: '18px', height: '18px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 4px',
            boxShadow: '0 1px 4px rgba(220,38,38,.4)',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: '380px', maxHeight: '520px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
          zIndex: 9000, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'slideUp .15s ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--text)' }}>
              Notifications {count > 0 && <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '10px', padding: '1px 7px', fontSize: '.7rem', marginLeft: 6 }}>{count} new</span>}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: '.72rem', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                Mark all read
              </button>
              <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); clearAll(); }} style={{ background: 'none', border: 'none', fontSize: '.72rem', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>
                Clear All
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.8rem' }}>Loading…</div>}
            {!loading && items.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.82rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔕</div>
                No notifications yet
              </div>
            )}
            {items.map(n => {
              const ps  = PRIORITY_STYLE[n.priority] || PRIORITY_STYLE.normal
              const ss  = STATUS_LABEL[n.status]     || STATUS_LABEL.pending
              const tos = Array.isArray(n.to_users) ? n.to_users : (JSON.parse(n.to_users || '[]'))
              return (
                <div
                  key={n.id}
                  onClick={() => n.isUnread && markRead(n.id)}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                    background: n.isUnread ? '#f0f7ff' : 'transparent',
                    cursor: 'pointer', transition: 'background .12s',
                    borderLeft: `3px solid ${ps.dot}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span>{TYPE_ICON[n.type] || '📌'}</span>
                        <span style={{ fontWeight: n.isUnread ? 700 : 600, fontSize: '.8rem', color: 'var(--text)' }}>
                          {n.title}
                        </span>
                        {n.isUnread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />}
                      </div>
                      {n.body && (
                        <div style={{ fontSize: '.73rem', color: 'var(--text-muted)', marginBottom: 5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '.66rem', color: 'var(--text-light)' }}>{fmtTime(n.created_at)}</span>
                        <span style={{ fontSize: '.66rem', color: 'var(--text-light)' }}>from {n.from_name}</span>
                        {tos.length > 0 && <span style={{ fontSize: '.66rem', color: 'var(--text-light)' }}>→ {tos.join(', ')}</span>}
                        <span style={{ fontSize: '.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', background: ss.bg, color: ss.color }}>
                          {ss.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Approve/Reject buttons for User Registrations */}
                  {['admin', 'dpm'].includes(user?.role) && n.type === 'approval_request' && n.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); approveOrReject(n.id, 'approve') }}
                        style={{ flex: 1, padding: '4px 0', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 6, fontSize: '.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >✓ Approve</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); approveOrReject(n.id, 'reject') }}
                        style={{ flex: 1, padding: '4px 0', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: '.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >✕ Reject</button>
                    </div>
                  )}
                  {/* Approve/Reject buttons for Project Edits */}
                  {['admin', 'dpm', 'sic', 'tl'].includes(user?.role) && n.type === 'edit_approval' && n.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); approveEditRequest(n.id, n.project_id, 'approve') }}
                        style={{ flex: 1, padding: '4px 0', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: '.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >✓ Apply Edits</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); approveEditRequest(n.id, n.project_id, 'reject') }}
                        style={{ flex: 1, padding: '4px 0', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: '.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >✕ Reject Edits</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', textAlign: 'center' }}>
            <a href="/audit" style={{ fontSize: '.73rem', color: 'var(--accent)', fontWeight: 600 }}>View Audit Log →</a>
          </div>
        </div>
      )}
    </div>
  )
}
