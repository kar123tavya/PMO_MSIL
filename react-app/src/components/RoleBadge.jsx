import React from 'react'
import { useAuth } from '../context/AuthContext'

const ROLE_CONFIG = {
  senior_manager: { label: 'Senior Manager', bg: '#fee2e2', color: '#991b1b', dot: '#dc2626', desc: 'Full Access' },
  section_head:   { label: 'Section Head',   bg: '#fff7ed', color: '#9a3412', dot: '#ea580c', desc: 'Division Access' },
  deputy_manager: { label: 'Deputy Manager', bg: '#fefce8', color: '#854d0e', dot: '#ca8a04', desc: 'Assigned Projects' },
  viewer:         { label: 'Viewer',          bg: '#f1f5f9', color: '#475569', dot: '#94a3b8', desc: 'Read Only' },
}

export default function RoleBadge({ showDesc = false }) {
  const { user } = useAuth()
  if (!user) return null
  const cfg = ROLE_CONFIG[user.role] || { label: user.role, bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8', desc: '' }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: cfg.bg, color: cfg.color,
      borderRadius: 20, padding: '4px 10px',
      fontSize: '.72rem', fontWeight: 700,
      border: `1px solid ${cfg.dot}44`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
      {showDesc && <span style={{ fontWeight: 500, opacity: .75 }}>— {cfg.desc}</span>}
    </div>
  )
}
