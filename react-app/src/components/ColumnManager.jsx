import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function ColumnManager({ onClose }) {
  const { can, user } = useAuth()
  const { showToast } = useToast()
  
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  
  // New column state
  const [label, setLabel] = useState('')
  const [colType, setColType] = useState('text')
  const [views, setViews] = useState({ dashboard: true, flagship: true, gantt: false })
  
  const isSM = ['senior_manager', 'admin', 'section_head'].includes(user?.role)

  useEffect(() => {
    fetchColumns()
  }, [])

  async function fetchColumns() {
    try {
      const res = await fetch('/api/settings/columns')
      if (res.ok) setColumns(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!label) return
    const id = label.toLowerCase().replace(/[^a-z0-9]/g, '_')
    if (columns.some(c => c.id === id)) return showToast('Column already exists!', 'error')
    
    const selectedViews = Object.keys(views).filter(k => views[k])
    
    try {
      const res = await fetch('/api/settings/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, label, type: colType, views: selectedViews })
      })
      if (!res.ok) throw new Error('Failed to propose column')
      const data = await res.json()
      showToast(data.status === 'approved' ? 'Column added!' : 'Column proposed for approval.', 'success')
      setLabel('')
      fetchColumns()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleApprove(id) {
    try {
      await fetch(`/api/settings/columns/${id}/approve`, { method: 'PUT' })
      showToast('Column approved!', 'success')
      fetchColumns()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this column? This removes it from all projects.')) return
    try {
      await fetch(`/api/settings/columns/${id}`, { method: 'DELETE' })
      showToast('Column deleted!', 'success')
      fetchColumns()
    } catch (e) { showToast(e.message, 'error') }
  }

  return (
    <Modal open title="Manage Custom Columns" onClose={onClose} size="lg">
      <div style={{display:'flex', gap:20}}>
        {/* Left: Add Column Form */}
        <div style={{flex:1}}>
          <h4 style={{marginBottom:10}}>Propose / Add Column</h4>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Column Name</label>
              <input value={label} onChange={e=>setLabel(e.target.value)} required placeholder="e.g. ROI Estimate" />
            </div>
            <div className="form-group">
              <label>Data Type</label>
              <select value={colType} onChange={e=>setColType(e.target.value)}>
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Yes/No</option>
              </select>
            </div>
            <div className="form-group">
              <label>Show In Views</label>
              <div style={{display:'flex', gap:15}}>
                <label className="checkbox-row">
                  <input type="checkbox" checked={views.dashboard} onChange={e=>setViews({...views, dashboard:e.target.checked})} /> Dashboard
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={views.flagship} onChange={e=>setViews({...views, flagship:e.target.checked})} /> Flagship
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={views.gantt} onChange={e=>setViews({...views, gantt:e.target.checked})} /> Gantt
                </label>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{marginTop:10}}>
              {isSM ? 'Add Column' : 'Propose Column'}
            </button>
            {!isSM && <p style={{fontSize:'0.7rem', color:'var(--text-muted)', marginTop:5}}>Requires Senior Manager approval</p>}
          </form>
        </div>

        {/* Right: Existing Columns List */}
        <div style={{flex:1, borderLeft:'1px solid var(--border)', paddingLeft:20}}>
          <h4 style={{marginBottom:10}}>Current Columns</h4>
          {loading ? <div>Loading...</div> : columns.length === 0 ? <div className="no-data">No custom columns.</div> : (
            <div style={{display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto'}}>
              {columns.map(c => (
                <div key={c.id} style={{padding:8, background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:4}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <strong style={{fontSize:'0.8rem'}}>{c.label}</strong>
                    <div style={{display:'flex', gap:5}}>
                      {c.status === 'pending' && isSM && (
                        <button className="btn-ghost" style={{color:'var(--primary)', padding:'2px 5px', fontSize:'0.7rem'}} onClick={()=>handleApprove(c.id)}>Approve</button>
                      )}
                      {isSM && (
                        <button className="btn-ghost" style={{color:'var(--error)', padding:'2px 5px', fontSize:'0.7rem'}} onClick={()=>handleDelete(c.id)}>Delete</button>
                      )}
                    </div>
                  </div>
                  <div style={{fontSize:'0.7rem', color:'var(--text-muted)', marginTop:4}}>
                    Type: {c.type} | Views: {c.views.join(', ')} | Status: 
                    <span style={{color: c.status==='approved'?'#166534':'#b45309', marginLeft:4}}>{c.status.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
