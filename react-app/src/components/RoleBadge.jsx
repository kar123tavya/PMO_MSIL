import React from 'react'
import { useAuth } from '../context/AuthContext'

const ROLE_CONFIG = {
  senior_manager: { label: 'Senior Manager', bg: '#fee2e2', color: '#991b1b', dot: '#dc2626', desc: 'Full Access' },
  section_head:   { label: 'Section Head',   bg: '#fff7ed', color: '#9a3412', dot: '#ea580c', desc: 'Division Access' },
  deputy_manager: { label: 'Deputy Manager', bg: '#fefce8', color: '#854d0e', dot: '#ca8a04', desc: 'Assigned Projects' },
  viewer:         { label: 'Viewer',          bg: '#f1f5f9', color: '#475569', dot: '#94a3b8', desc: 'Read Only' },
}

export default function RoleBadge({ showDesc = false }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = React.useState(false)
  
  // Close on click outside
  React.useEffect(() => {
    const handleClick = () => setOpen(false)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  if (!user) return null
  const cfg = ROLE_CONFIG[user.role] || { label: user.role, bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8', desc: '' }

  return (
    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <div 
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: cfg.bg, color: cfg.color,
          borderRadius: 20, padding: '4px 10px',
          fontSize: '0.8rem', fontWeight: 600, border: `1px solid ${cfg.color}33`,
          cursor: 'pointer'
        }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
        <span>{cfg.label}</span>
        {showDesc && <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: 4 }}>— {cfg.desc}</span>}
      </div>
      
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          background: 'var(--surface-1)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '16px', minWidth: 200, zIndex: 100
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{user.name}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: 12 }}>{user.email}</div>
          
          <div className="divider" style={{ margin: '8px 0' }} />
          
          <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-light)' }}>Role:</span> {cfg.label}
          </div>
          {user.division && (
            <div style={{ fontSize: '0.85rem', marginBottom: 16 }}>
              <span style={{ color: 'var(--text-light)' }}>Division:</span> {user.division}
            </div>
          )}
          
          <button 
            className="btn btn-ghost" 
            style={{ width: '100%', color: '#dc2626', border: '1px solid #fee2e2' }}
            onClick={() => logout()}
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  )
}
