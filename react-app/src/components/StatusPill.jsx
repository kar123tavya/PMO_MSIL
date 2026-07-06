import React from 'react'

const STATUS_STYLES = {
  IL1:       { bg:'#f5f3ff', color:'#6d28d9', border:'#c4b5fd' },
  IL2:       { bg:'#eff6ff', color:'#1d4ed8', border:'#93c5fd' },
  IL3:       { bg:'#f0fdf4', color:'#15803d', border:'#86efac' },
  IL4:       { bg:'#fffbeb', color:'#b45309', border:'#fcd34d' },
  IL5:       { bg:'#fef2f2', color:'#b91c1c', border:'#fca5a5' },
  Live:      { bg:'#ecfdf5', color:'#065f46', border:'#6ee7b7' },
  'On Hold': { bg:'#f8fafc', color:'#475569', border:'#cbd5e1' },
  Cancelled: { bg:'#fef2f2', color:'#991b1b', border:'#fca5a5' },
}

export default function StatusPill({ status }) {
  const s = STATUS_STYLES[status]
  if (!s) return <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>—</span>
  return (
    <span className="status-pill" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {status}
    </span>
  )
}
