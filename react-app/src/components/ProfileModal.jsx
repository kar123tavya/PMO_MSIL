import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../api/client'

export default function ProfileModal({ onClose }) {
  const { user, logout } = useAuth()
  const toast = useToast()
  
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (password && password !== confirmPassword) {
      return toast.show('Passwords do not match.', 'error')
    }

    setLoading(true)
    try {
      await api.put('/users/profile', { email, password })
      toast.show('Profile updated successfully! Please log in again.', 'success')
      
      // Force user to login again since their token payload might be outdated or they changed password
      setTimeout(() => {
        logout()
      }, 1500)
    } catch (err) {
      toast.show(err.response?.data?.error || 'Failed to update profile.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 400 }}>
        <h2 style={{ marginBottom: 16 }}>My Profile Settings</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={user?.name || ''} disabled style={{ background: '#f5f5f5' }} />
            <small style={{ color: 'var(--text-muted)' }}>Name changes must be done by an Admin.</small>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>New Password <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(Leave blank to keep current)</span></label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
            />
          </div>

          {password && (
            <div className="form-group">
              <label>Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: 24, justifyContent: 'flex-end', display: 'flex', gap: 12 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
