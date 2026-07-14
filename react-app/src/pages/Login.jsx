import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [mode, setMode]       = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [rEmail, setREmail]   = useState('')
  const [rName, setRName]     = useState('')
  const [rStaff, setRStaff]   = useState('')
  const [rDesig, setRDesig]   = useState('')
  const [rRole, setRRole]     = useState('pic')
  const [rDept, setRDept]     = useState('')
  const [rDiv, setRDiv]       = useState('')
  const [rSec, setRSec]       = useState('')
  const [rPass, setRPass]     = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try { await login(email, pass); navigate('/') }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rEmail, name: rName, staffNo: rStaff, designation: rDesig, role: rRole, department: rDept, division: rDiv, section: rSec, password: rPass }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess('Account created — awaiting admin approval.')
      setMode('login')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const sw = (m) => { setMode(m); setError(''); setSuccess('') }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-form-wrap">
          <div style={{ display:'flex', flexDirection: 'column', alignItems:'center', gap:12, marginBottom:32 }}>
            <div className="login-logo" style={{ marginBottom: 0 }}>
              <img 
                src="/maruti-logo.png" 
                alt="Maruti Suzuki" 
                style={{ height: '50px', width: 'auto', display: 'block' }} 
              />
            </div>
            <div style={{ fontSize:'.85rem', color:'var(--text-muted)', fontWeight: 500 }}>Project Monitoring Tool</div>
          </div>

          {mode === 'login' ? (
            <>
              <h1 className="login-heading">Welcome Back</h1>
              <p className="login-sub">Sign in to continue</p>
              {error   && <div className="login-error">{error}</div>}
              {success && <div className="login-success">{success}</div>}
              <form className="login-form" onSubmit={handleLogin}>
                <input className="login-input" type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus />
                <input className="login-input" type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} required />
                <button className="login-btn" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
              </form>
              <p className="login-toggle">New user? <a href="#" onClick={e=>{e.preventDefault();sw('register')}}>Create account</a></p>
            </>
          ) : (
            <>
              <h1 className="login-heading">Create Account</h1>
              <p className="login-sub">Register for access — admin approval required</p>
              {error && <div className="login-error">{error}</div>}
              <form className="login-form" onSubmit={handleRegister}>
                <input className="login-input" type="email"    placeholder="Maruti Suzuki Email" value={rEmail} onChange={e=>setREmail(e.target.value)} required />
                <input className="login-input" type="text"     placeholder="Full Name"           value={rName}  onChange={e=>setRName(e.target.value)}  required />
                <input className="login-input" type="text"     placeholder="Staff Number"        value={rStaff} onChange={e=>setRStaff(e.target.value)} />
                {rRole === 'pic' && (
                  <select className="login-input" value={rDiv} onChange={e=>setRDiv(e.target.value)} required>
                    <option value="">-- Select Division --</option>
                    <option value="MQ">MQ</option>
                    <option value="ND">ND</option>
                    <option value="PQ-MP">PQ-MP</option>
                    <option value="PQ-NPD">PQ-NPD</option>
                    <option value="COP">COP</option>
                    <option value="PDS">PDS</option>
                    <option value="VI">VI</option>
                    <option value="VU">VU</option>
                    <option value="MA">MA</option>
                    <option value="VQ">VQ</option>
                  </select>
                )}
                <select className="login-input" value={rRole} onChange={e=>setRRole(e.target.value)}>
                  <option value="viewer">Viewer</option>
                  <option value="pic">Person In Charge (PIC)</option>
                  <option value="tl">Team Lead (TL)</option>
                  <option value="sic">Section In Charge (SIC)</option>
                  <option value="dpm">Department Project Manager (DPM)</option>
                </select>
                <input className="login-input" type="password" placeholder="Password (min 6)"    value={rPass}  onChange={e=>setRPass(e.target.value)}  required minLength={6} />
                <button className="login-btn" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Sign Up'}</button>
              </form>
              <p className="login-toggle">Already registered? <a href="#" onClick={e=>{e.preventDefault();sw('login')}}>Sign In</a></p>
            </>
          )}
        </div>
      </div>

      <div className="login-right">
        <h2>Project Monitoring Tool</h2>
        <p>Centralized portfolio management for Maruti Suzuki's QA Vertical.</p>
        <ul className="feature-list">
          <li>Real-time Live Sync across users</li>
          <li>Flagship Project Tracking</li>
          <li>Interactive Gantt Chart</li>
          <li>Role-based Access Control</li>
          <li>Persistent SQLite Database</li>
        </ul>
      </div>
    </div>
  )
}
