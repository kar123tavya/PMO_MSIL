import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../api/client'

export default function ProfileModal({ onClose }) {
  const { user, logout } = useAuth()
  const toast = useToast()
  
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [staffNo, setStaffNo] = useState(user?.staffNo || '')
  const [photo, setPhoto] = useState(user?.photo_base64 || '')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Ensure it's an image
    if (!file.type.startsWith('image/')) {
      toast.show('Please select a valid image file.', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      // Just save the raw base64 string. The server limit is 10MB.
      setPhoto(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (password && password !== confirmPassword) {
      return toast.show('Passwords do not match.', 'error')
    }

    setLoading(true)
    try {
      await api.put('/users/profile', { name, email, staffNo, password, photo_base64: photo })
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 10 }}>
            <div 
              style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface-2)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8, cursor: 'pointer' }}
              onClick={() => document.getElementById('photo-upload').click()}
            >
              {photo ? <img src={photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem' }}>{(name || 'U')[0].toUpperCase()}</span>}
            </div>
            <label style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
              Change Photo
              <input id="photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            </label>
          </div>

          <div className="form-group">
            <label>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Staff No. (Optional)</label>
            <input type="text" value={staffNo} onChange={e => setStaffNo(e.target.value)} placeholder="e.g. MS12345" />
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
