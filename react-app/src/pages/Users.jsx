import React, { useState, useEffect } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import RoleBadge from '../components/RoleBadge'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Users() {
  const { can, user, getRoleLabel } = useAuth()
  const { showToast } = useToast()
  
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('pmo_session') ? JSON.parse(sessionStorage.getItem('pmo_session')).token : ''}` }
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setUsers(data)
    } catch (e) {
      showToast('Could not load users.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(uid) {
    try {
      const res = await fetch(`/api/users/${uid}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('pmo_session') ? JSON.parse(sessionStorage.getItem('pmo_session')).token : ''}` }
      })
      if (!res.ok) throw new Error('Failed to approve')
      showToast('User approved successfully.', 'success')
      fetchUsers()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleDelete(uid) {
    if (!window.confirm("Are you sure you want to delete this user?")) return
    try {
      const res = await fetch(`/api/users/${uid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('pmo_session') ? JSON.parse(sessionStorage.getItem('pmo_session')).token : ''}` }
      })
      if (!res.ok) throw new Error('Failed to delete')
      showToast('User deleted.', 'success')
      fetchUsers()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleUserChange(uid, updates) {
    const target = users.find(u => u.uid === uid)
    if (!target) return
    try {
      const res = await fetch(`/api/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('pmo_session') ? JSON.parse(sessionStorage.getItem('pmo_session')).token : ''}` 
        },
        body: JSON.stringify({ ...target, ...updates })
      })
      if (!res.ok) throw new Error('Failed to update user')
      showToast('User updated successfully.', 'success')
      fetchUsers()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  if (!can('manage_users')) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header title="User Management"><RoleBadge /></Header>
          <div className="page-content" style={{textAlign: 'center', marginTop: 40}}>
            <h2>Access Denied</h2>
            <p>You must be a Senior Manager to view this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header title="User Management">
          <RoleBadge />
        </Header>

        <div className="page-content">
          <div className="card" style={{padding: '24px'}}>
            <h2 style={{marginTop: 0}}>Team Members</h2>
            <p className="text-muted">Approve new registrations and manage roles for your dashboard users.</p>
            
            {loading ? <p>Loading users...</p> : (
              <div className="table-wrap" style={{marginTop: 24}}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Staff No / Desig</th>
                      <th>Division</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.uid}>
                        <td style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10}}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                            {u.photo_base64 ? (
                              <img src={u.photo_base64} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (u.name || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            {u.name} {u.uid === user.uid && <span className="stage-tag" style={{marginLeft: 8}}>You</span>}
                          </div>
                        </td>
                        <td style={{fontSize: '0.85rem'}}>{u.email}</td>
                        <td style={{fontSize: '0.85rem'}}>{u.staffNo || '—'} / {u.designation || '—'}</td>
                        <td>
                          {u.uid === user.uid ? (
                            <span className="text-muted">{u.division || '—'}</span>
                          ) : (
                            <input 
                              type="text" 
                              className="input-field" 
                              style={{padding: '4px 8px', fontSize: '0.85rem', width: '120px'}}
                              value={u.division || ''}
                              placeholder="Set Division..."
                              onChange={(e) => {
                                const newUsers = [...users]
                                const idx = newUsers.findIndex(x => x.uid === u.uid)
                                newUsers[idx].division = e.target.value
                                setUsers(newUsers)
                              }}
                              onBlur={(e) => handleUserChange(u.uid, { division: e.target.value })}
                            />
                          )}
                        </td>
                        <td>
                          {u.uid === user.uid ? (
                            <span className="stage-tag">{getRoleLabel(u.role)}</span>
                          ) : (
                            <div style={{display:'flex', flexDirection:'column', gap:4}}>
                              <select 
                                className="filter-select" 
                                style={{padding: '4px', fontSize: '0.85rem', width: 'auto'}}
                                value={u.role}
                                onChange={(e) => handleUserChange(u.uid, { role: e.target.value })}
                              >
                                <option value="viewer">Viewer</option>
                                <option value="pic">Person In Charge (PIC)</option>
                                <option value="tl">Team Lead (TL)</option>
                                <option value="sic">Section In Charge (SIC)</option>
                                <option value="dpm">Department Project Manager (DPM)</option>
                                <option value="admin">Admin</option>
                              </select>
                              
                              {['pic', 'tl', 'sic'].includes(u.role) && (
                                <select 
                                  className="filter-select" 
                                  style={{padding: '4px', fontSize: '0.8rem', width: 'auto', background: '#f8fafc'}}
                                  value={u.manager_email || ''}
                                  onChange={(e) => handleUserChange(u.uid, { manager_email: e.target.value })}
                                >
                                  <option value="">-- Select Manager --</option>
                                  {users.filter(m => {
                                    if (u.role === 'pic') return m.role === 'tl';
                                    if (u.role === 'tl') return m.role === 'sic';
                                    if (u.role === 'sic') return m.role === 'dpm';
                                    return false;
                                  }).map(m => (
                                    <option key={m.uid} value={m.email}>{m.name} ({getRoleLabel(m.role)})</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="stage-tag" style={{background: u.status === 'active' ? '#dcfce7' : '#fef9c3', color: u.status === 'active' ? '#166534' : '#854d0e'}}>
                            {u.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{display: 'flex', gap: 8}}>
                          {u.status === 'pending' && (
                            <button className="btn btn-primary" style={{padding: '4px 8px', fontSize: '0.75rem'}} onClick={() => handleApprove(u.uid)}>Approve</button>
                          )}
                          {u.uid !== user.uid && (
                            <button className="btn btn-ghost" style={{padding: '4px 8px', fontSize: '0.75rem', color: '#dc2626'}} onClick={() => handleDelete(u.uid)}>Delete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
