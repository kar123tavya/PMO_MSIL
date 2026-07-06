import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Header  from '../components/Header'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const ACTION_STYLE = {
  created:  { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  updated:  { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
  deleted:  { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  imported: { bg: '#f5f3ff', color: '#7c3aed', border: '#c4b5fd' },
  approved: { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7' },
  rejected: { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' },
}

function fmtTs(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

export default function AuditLog() {
  const { user, can } = useAuth()
  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [search,  setSearch]  = useState('')
  const [actionF, setActionF] = useState('')
  const [fromD,   setFromD]   = useState('')
  const [toD,     setToD]     = useState('')
  const [page,    setPage]    = useState(0)
  const PAGE_SIZE = 50

  const getToken = () => { try { return JSON.parse(sessionStorage.getItem('pmo_session') || '{}').token || '' } catch { return '' } }

  const fetchAudit = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE }
      if (actionF) params.action = actionF
      if (fromD)   params.from   = fromD
      if (toD)     params.to     = toD
      const { data } = await axios.get('/api/audit', { headers: { Authorization: `Bearer ${getToken()}` }, params })
      setRows(data.rows || [])
      setTotal(data.total || 0)
    } catch {}
    finally { setLoading(false) }
  }, [page, actionF, fromD, toD])

  useEffect(() => { fetchAudit() }, [fetchAudit])

  function handleExportAudit() {
    const token = getToken()
    fetch('/api/audit/export', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.blob() : Promise.reject('Export failed'))
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href = url; a.download = `PMO_AuditLog_${new Date().toISOString().slice(0,10)}.xlsx`
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
      })
      .catch(e => alert('Export failed: ' + e))
  }

  // Client-side search filter
  const filtered = rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (r.project_name || '').toLowerCase().includes(q) ||
           (r.user_name    || '').toLowerCase().includes(q) ||
           (r.action       || '').toLowerCase().includes(q) ||
           (r.field_name   || '').toLowerCase().includes(q)
  })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header title="Audit Log" searchValue={search} onSearch={setSearch}>
          {can('export') && (
            <button className="btn btn-ghost" onClick={handleExportAudit}>⬇ Export Audit</button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={fetchAudit}>↻ Refresh</button>
        </Header>

        <div className="page-content">
          {/* Filters */}
          <div className="filters-bar" style={{ marginBottom: 14 }}>
            <select className="filter-select" value={actionF} onChange={e => setActionF(e.target.value)}>
              <option value="">All Actions</option>
              {['created','updated','deleted','imported','approved','rejected'].map(a => (
                <option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>
              ))}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>From</label>
              <input type="date" className="filter-select" value={fromD} onChange={e => setFromD(e.target.value)} style={{ padding: '5px 8px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>To</label>
              <input type="date" className="filter-select" value={toD} onChange={e => setToD(e.target.value)} style={{ padding: '5px 8px' }} />
            </div>
            <button className="btn btn-ghost" onClick={() => { setActionF(''); setFromD(''); setToD(''); setSearch('') }}>Clear</button>
            <div style={{ marginLeft: 'auto', fontSize: '.75rem', color: 'var(--text-muted)' }}>
              Showing {filtered.length} of {total} entries
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Project</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Field Changed</th>
                  <th>From</th>
                  <th>To</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="no-data">Loading audit log…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={8} className="no-data">No audit entries found.</td></tr>
                )}
                {filtered.map((r, i) => {
                  const as = ACTION_STYLE[r.action] || { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' }
                  return (
                    <tr key={r.id} style={{ background: i % 2 === 1 ? 'var(--surface-2)' : '' }}>
                      <td style={{ fontSize: '.72rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtTs(r.timestamp)}</td>
                      <td style={{ fontWeight: 600, fontSize: '.8rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.project_name || '—'}</td>
                      <td>
                        <span style={{ display:'inline-block', background: as.bg, color: as.color, border:`1px solid ${as.border}`, borderRadius: 20, padding:'2px 10px', fontSize:'.68rem', fontWeight:700 }}>
                          {r.action || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '.78rem' }}>{r.user_name || '—'}</td>
                      <td style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{(r.role || '').replace('_',' ')}</td>
                      <td style={{ fontSize: '.75rem', color: 'var(--text-2)' }}>{r.field_name || '—'}</td>
                      <td style={{ fontSize: '.73rem', color: '#dc2626', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.from_val}>{r.from_val || '—'}</td>
                      <td style={{ fontSize: '.73rem', color: '#059669', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.to_val}>{r.to_val || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(0)} disabled={page === 0}>«</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>‹ Prev</button>
              <span style={{ padding: '5px 14px', fontSize: '.8rem', color: 'var(--text-muted)' }}>
                Page {page + 1} of {totalPages}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next ›</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
