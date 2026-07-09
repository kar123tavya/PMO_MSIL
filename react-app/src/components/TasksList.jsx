import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProjects } from '../context/ProjectContext'

const PRIORITY_STYLE = {
  urgent: { border: '#dc2626', bg: '#fef2f2', dot: '#dc2626' },
  high:   { border: '#d97706', bg: '#fffbeb', dot: '#d97706' },
  normal: { border: '#e5e7eb', bg: '#fff', dot: '#9ca3af' },
}

export default function TasksList() {
  const { user } = useAuth()
  const { projects } = useProjects()
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)

  useEffect(() => {
    function outside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  // --- Generate Synthetic Deadline Alerts ---
  const today = new Date(); today.setHours(0,0,0,0);
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + 14);
  const isSM = user?.role === 'admin' || user?.role === 'department_head' || user?.role === 'division_head' || user?.role === 'section_head';
  
  const deadlineAlerts = (projects || []).filter(p => {
    if (!isSM && p.assignedStaffId !== user?.staff_no) return false;
    if (!p.liveTarget) return false;
    if (p.status === 'Live' || p.status === 'Cancelled') return false;
    const d = new Date(p.liveTarget);
    return d <= cutoff;
  }).map(p => {
    const d = new Date(p.liveTarget);
    const diff = Math.floor((d - today) / 86400000);
    return {
      id: `deadline_${p._key}`,
      type: 'deadline_alert',
      priority: diff < 0 ? 'urgent' : diff <= 7 ? 'high' : 'normal',
      title: `${p.project}`,
      body: diff < 0 ? `${Math.abs(diff)} days overdue! (Target: ${p.liveTarget})` : `${diff} days left (Target: ${p.liveTarget})`,
      created_at: new Date().toISOString(),
    };
  }).sort((a,b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
    return 0;
  });

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
        title="Tasks List"
      >
        📋
        {deadlineAlerts.length > 0 && (
          <div style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: 800,
            borderRadius: '10px', padding: '1px 5px', lineHeight: 1.2
          }}>
            {deadlineAlerts.length}
          </div>
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
              Tasks List {deadlineAlerts.length > 0 && <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '10px', padding: '1px 7px', fontSize: '.7rem', marginLeft: 6 }}>{deadlineAlerts.length} alerts</span>}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {deadlineAlerts.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.82rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                No pending tasks
              </div>
            )}
            {deadlineAlerts.map(n => {
              const ps  = PRIORITY_STYLE[n.priority] || PRIORITY_STYLE.normal
              return (
                <div
                  key={n.id}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                    background: 'transparent',
                    borderLeft: `3px solid ${ps.dot}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span>⏰</span>
                        <span style={{ fontWeight: 600, fontSize: '.8rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {n.title}
                        </span>
                      </div>
                      <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                        {n.body}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
