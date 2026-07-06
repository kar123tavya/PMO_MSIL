import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'

const NAV = [
  { to: '/',         label: 'Dashboard',         icon: '▦', end: true },
  { to: '/flagship', label: 'Flagship Projects',  icon: '◈', end: false },
  { to: '/gantt',    label: 'Gantt Chart',         icon: '▤', end: false },
  { to: '/audit',    label: 'Audit Log',           icon: '📋', end: false },
]

export default function Sidebar() {
  const { user, logout, getRoleLabel } = useAuth()
  const { count } = useNotifications()

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">S</div>
        <div className="brand-text">
          <div className="brand-name">PMO Dashboard</div>
          <div className="brand-sub">Maruti Suzuki · QA Vertical</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
          >
            <span className="nav-icon">{n.icon}</span>
            <span style={{ flex: 1 }}>{n.label}</span>
          </NavLink>
        ))}

        <div className="divider" style={{ margin: '14px 0' }} />
        <div className="nav-section-label">Info</div>
        <div style={{ padding: '8px 12px', fontSize: '.7rem', color: 'rgba(255,255,255,.35)', lineHeight: 1.7 }}>
          <div>🏢 QA Vertical</div>
          <div>📅 {new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
        </div>
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="user-avatar">{(user?.name || 'U')[0].toUpperCase()}</div>
        <div className="user-info">
          <div className="user-name">{user?.name || 'User'}</div>
          <div className="user-role">{getRoleLabel ? getRoleLabel(user?.role) : user?.role}</div>
        </div>
        <button className="logout-btn" onClick={logout} title="Sign out">⏻</button>
      </div>
    </aside>
  )
}
