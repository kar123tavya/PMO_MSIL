import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Shows an alert banner when any projects have deadlines within `warnDays` (default 14).
 * Props: projects — full project list from ProjectContext
 */
export default function DeadlineAlerts({ projects, warnDays = 14 }) {
  const { user, can } = useAuth()
  const [dismissed, setDismissed]  = useState([])
  const [collapsed, setCollapsed]  = useState(false)

  const today   = new Date(); today.setHours(0,0,0,0)
  const cutoff  = new Date(today); cutoff.setDate(cutoff.getDate() + warnDays)

  const isSM = user?.role === 'senior_manager' || user?.role === 'section_head'

  const alerts = (projects || []).filter(p => {
    if (!isSM && p.assignedStaffId !== user?.staff_no) return false
    if (!p.liveTarget) return false
    if (p.status === 'Live' || p.status === 'Cancelled') return false
    if (dismissed.includes(p._key)) return false
    const d = new Date(p.liveTarget)
    return d <= cutoff  // includes overdue
  }).map(p => {
    const d     = new Date(p.liveTarget)
    const diff  = Math.floor((d - today) / 86400000)
    return { ...p, daysLeft: diff }
  }).sort((a,b) => a.daysLeft - b.daysLeft)

  if (alerts.length === 0) return null

  return (
    <div style={{
      background: '#fffbeb', border: '1.5px solid #fcd34d',
      borderRadius: '10px', marginBottom: '16px', overflow: 'hidden',
    }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', cursor: 'pointer',
          background: '#fef3c7', borderBottom: collapsed ? 'none' : '1px solid #fcd34d',
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>⏰</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: '.83rem', color: '#92400e' }}>
            {alerts.filter(a => a.daysLeft < 0).length > 0
              ? `🔴 ${alerts.filter(a => a.daysLeft < 0).length} Overdue, `
              : ''}
            {alerts.filter(a => a.daysLeft >= 0 && a.daysLeft <= 7).length > 0
              ? `🟠 ${alerts.filter(a => a.daysLeft >= 0 && a.daysLeft <= 7).length} Due this week, `
              : ''}
            {alerts.filter(a => a.daysLeft > 7).length > 0
              ? `🟡 ${alerts.filter(a => a.daysLeft > 7).length} Due in {warnDays} days`
              : ''}
            {' — Deadline Alerts'}
          </span>
        </div>
        <span style={{ fontSize: '.8rem', color: '#92400e', fontWeight: 600 }}>
          {collapsed ? '▼ Show' : '▲ Hide'}
        </span>
      </div>

      {!collapsed && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10 }}>
            {alerts.map(p => {
              const overdue   = p.daysLeft < 0
              const thisWeek  = p.daysLeft >= 0 && p.daysLeft <= 7
              const accent    = overdue ? '#dc2626' : thisWeek ? '#d97706' : '#b45309'
              const bg        = overdue ? '#fef2f2' : thisWeek ? '#fffbeb' : '#fefce8'
              const border    = overdue ? '#fca5a5' : thisWeek ? '#fcd34d' : '#fde68a'
              const icon      = overdue ? '🔴' : thisWeek ? '🟠' : '🟡'
              return (
                <div
                  key={p._key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: bg, border: `1px solid ${border}`,
                    borderRadius: 8, padding: '8px 12px',
                  }}
                >
                  <span>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '.8rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.project}
                    </div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
                      {p.division && `${p.division} · `}{p.status && `${p.status} · `}Target: {p.liveTarget}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '.88rem', color: accent }}>
                      {overdue ? `${Math.abs(p.daysLeft)}d overdue` : p.daysLeft === 0 ? 'TODAY' : `${p.daysLeft}d left`}
                    </div>
                  </div>
                  <button
                    onClick={() => setDismissed(d => [...d, p._key])}
                    title="Dismiss"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
                  >✕</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
