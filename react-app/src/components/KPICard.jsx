import React from 'react'

export default function KPICard({ label, value, sub, accent = '#1a56db', icon }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-accent" style={{ background: accent }} />
      {icon && (
        <div className="kpi-icon" style={{ background: accent + '18', color: accent }}>
          {icon}
        </div>
      )}
      <div className="kpi-value">{value ?? '—'}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}
