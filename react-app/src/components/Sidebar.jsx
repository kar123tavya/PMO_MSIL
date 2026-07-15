import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'

const NAV = [
  { to: '/',            label: 'Dashboard',         icon: '▦', end: true },
  { to: '/flagship',    label: 'Flagship Projects', icon: '◈', end: false },
  { to: '/gantt',       label: 'Gantt Chart',       icon: '▤', end: false },
  { to: '/healthcard',  label: 'Health Card',       icon: '🏥', end: false },
  { to: '/audit',       label: 'Audit Log',         icon: '📋', end: false },
]

export default function Sidebar() {
  const { user, logout, getRoleLabel, can } = useAuth()
  const { count } = useNotifications()

  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (collapsed) {
      document.body.classList.add('sidebar-collapsed')
    } else {
      document.body.classList.remove('sidebar-collapsed')
    }
  }, [collapsed])

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand" style={{ position: 'relative', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!collapsed && (
          <img 
            src="/maruti-logo.png" 
            alt="Maruti Suzuki" 
            className="brand-text"
            style={{ maxWidth: '90%', maxHeight: '28px', objectFit: 'contain', display: 'block' }} 
          />
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            id={`nav-${n.to.replace('/','') || 'dashboard'}`}
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
          >
            <span className="nav-icon">{n.icon}</span>
            <span style={{ flex: 1 }}>{n.label}</span>
          </NavLink>
        ))}
        {can('manage_users') && (
          <NavLink
            to="/users"
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
          >
            <span className="nav-icon">👥</span>
            <span style={{ flex: 1 }}>Users</span>
          </NavLink>
        )}
        {user?.role === 'dpm' && (
          <NavLink
            to="/performance"
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
          >
            <span className="nav-icon">📊</span>
            <span style={{ flex: 1 }}>Performance</span>
          </NavLink>
        )}

        <div className="divider" style={{ margin: '14px 0' }} />
        <div className="nav-section-label">Help</div>
        <button 
          onClick={() => window.dispatchEvent(new Event('start-tutorial'))}
          className="nav-item" 
          style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}
        >
          <span className="nav-icon">💡</span>
          <span style={{ flex: 1 }}>Interactive Tutorial</span>
        </button>
      </nav>

      <button 
        onClick={() => setCollapsed(!collapsed)}
        style={{ padding: '12px', background: 'transparent', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-light)', display: 'flex', justifyContent: 'center' }}
      >
        {collapsed ? '>>' : '<< Minimize Sidebar'}
      </button>

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
