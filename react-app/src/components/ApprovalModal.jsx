import React, { useState, useEffect } from 'react'
import { useNotifications } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const PRIORITY_OPTS = [
  { value: 'normal', label: '⬜ Normal', color: '#6b7280' },
  { value: 'high',   label: '🟧 High',   color: '#d97706' },
  { value: 'urgent', label: '🟥 Urgent', color: '#dc2626' },
]

/**
 * Outlook-style approval compose dialog.
 * Props:
 *   project     — project that was edited
 *   changes     — array of { field, from, to } diffs
 *   isCompletion — boolean, true if this is a phase completion notification
 *   completedPhases — array of completed phase names
 *   onClose     — close handler
 *   onSent      — called after approval sent
 */
export default function ApprovalModal({ project, changes = [], isCompletion = false, completedPhases = [], onClose, onSent }) {
  const { sendApproval } = useNotifications()
  const { user }         = useAuth()

  const [users,   setUsers]   = useState([])
  const [to,      setTo]      = useState([])
  const [cc,      setCc]      = useState([])
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [priority, setPriority] = useState('normal')
  const [subject, setSubject] = useState(isCompletion 
    ? `Progress Update: ${completedPhases.join(', ')} Completed for ${project?.project || 'Project'}` 
    : `Approval Required: ${project?.project || 'Project'} — Changes by ${user?.name || 'User'}`)
  const [body,    setBody]    = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)

  // Build the change summary for email body
  const changeSummary = changes.length > 0
    ? changes.map(c => `• ${c.field}: "${c.from || '—'}" → "${c.to || '—'}"`).join('\n')
    : 'General project update.'

  useEffect(() => {
    let defaultBody = ''
    if (isCompletion) {
      defaultBody = `Dear Team,

I am pleased to inform you that the following phases have been successfully completed:
${completedPhases.map(p => `✅ ${p}`).join('\n')}

Project: ${project?.project || '—'}
Project Code: ${project?.parentCode || '—'}
Division: ${project?.division || '—'}
Updated By: ${user?.name || '—'}

Please review the progress in the PMO Dashboard:
http://localhost:3000

Regards,
${user?.name || 'PMO Team'}`
    } else {
      defaultBody = `Dear Team,

Please review and approve the following changes made to the project:

Project: ${project?.project || '—'}
Project Code: ${project?.parentCode || '—'}
Division: ${project?.division || '—'}
Status: ${project?.status || '—'}
Changed By: ${user?.name || '—'} (${user?.role?.replace('_',' ') || '—'})
Change Time: ${new Date().toLocaleString('en-IN')}

Changes Made:
${changeSummary}

Please approve or reject this change in the PMO Dashboard:
http://localhost:3000

Regards,
${user?.name || 'PMO Team'}
Digital & IT Division, Maruti Suzuki India Ltd.`
    }
    setBody(defaultBody)
  }, [])

  // Fetch user list for autocomplete
  useEffect(() => {
    const token = (() => { try { return JSON.parse(sessionStorage.getItem('pmo_session') || '{}').token || '' } catch { return '' } })()
    axios.get('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setUsers(r.data || []))
      .catch(() => {})
    // Default To: all senior managers
    axios.get('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        const sms = (r.data || []).filter(u => u.role === 'senior_manager' && u.email !== user?.email)
        setTo(sms.map(u => u.email))
      })
      .catch(() => {})
  }, [])

  function addEmails(input, setInput, list, setList) {
    const emails = input.split(/[;, ]+/).map(e => e.trim()).filter(e => e && !list.includes(e))
    if (emails.length) setList(prev => [...prev, ...emails])
    setInput('')
  }

  function removeEmail(email, list, setList) {
    setList(list.filter(e => e !== email))
  }

  function buildMailto() {
    const toStr = to.join(';')
    const ccStr = cc.join(';')
    const sub   = encodeURIComponent(subject)
    const bd    = encodeURIComponent(body)
    return `mailto:${toStr}?cc=${ccStr}&subject=${sub}&body=${bd}`
  }

  async function handleSend() {
    setSending(true)
    try {
      await sendApproval({
        title: subject,
        body: body.slice(0, 500),
        to_users: to,
        cc_users: cc,
        project_id:   project?._key,
        project_name: project?.project,
        priority,
        changes_json: changes,
      })
      setSent(true)
      // Also open Outlook
      window.location.href = buildMailto()
      setTimeout(() => { onSent?.(); onClose() }, 1500)
    } catch (err) {
      alert('Failed to send: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  const EmailChips = ({ list, setList, input, setInput, placeholder }) => (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
      padding: '6px 8px', border: '1.5px solid var(--border)',
      borderRadius: '6px', background: 'var(--surface)', minHeight: 36,
      cursor: 'text', transition: 'border-color .15s',
    }}
      onFocus={() => {}} // just for border visual
    >
      {list.map(e => (
        <span key={e} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: '#eff6ff', color: '#1a56db', border: '1px solid #93c5fd',
          borderRadius: '20px', padding: '1px 8px', fontSize: '.73rem', fontWeight: 600,
        }}>
          {e}
          <button onClick={() => removeEmail(e, list, setList)} style={{ background: 'none', border: 'none', color: '#1a56db', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (['Enter',',',';',' '].includes(e.key)) { e.preventDefault(); addEmails(input, setInput, list, setList) } }}
        onBlur={() => addEmails(input, setInput, list, setList)}
        placeholder={list.length === 0 ? placeholder : ''}
        style={{ border: 'none', outline: 'none', flex: 1, minWidth: 120, fontSize: '.82rem', fontFamily: 'inherit', background: 'transparent' }}
        list={`email-suggestions-${placeholder}`}
      />
      <datalist id={`email-suggestions-${placeholder}`}>
        {users.map(u => <option key={u.email} value={u.email}>{u.name} — {u.email}</option>)}
      </datalist>
    </div>
  )

  if (sent) return (
    <div className="modal-overlay">
      <div className="modal modal-sm" style={{ textAlign: 'center', padding: '48px 32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 6 }}>{isCompletion ? 'Progress Update Sent!' : 'Approval Request Sent!'}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '.83rem' }}>
          Notification sent to {to.join(', ')}<br/>Outlook has been opened with the email draft.
        </div>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg" style={{ width: 'min(680px, 96vw)' }}>
        {/* Outlook-style header */}
        <div style={{
          background: isCompletion ? '#059669' : 'var(--brand)', padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between',
          borderRadius: '14px 14px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.1rem' }}>📧</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '.9rem' }}>{isCompletion ? 'Send Progress Update' : 'New Approval Request'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: '6px', width: 28, height: 28, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Toolbar */}
        <div style={{ background: '#f8fafc', padding: '8px 16px', display: 'flex', gap: 8, borderBottom: '1px solid var(--border)' }}>
          {PRIORITY_OPTS.map(p => (
            <button key={p.value} onClick={() => setPriority(p.value)} style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '.73rem', fontWeight: 600,
              cursor: 'pointer', border: '1.5px solid',
              borderColor: priority === p.value ? p.color : 'var(--border)',
              background:  priority === p.value ? p.color + '18' : 'transparent',
              color: priority === p.value ? p.color : 'var(--text-muted)',
              transition: 'all .15s',
            }}>
              {p.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: '.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>📋</span> {project?.project || 'Project'}
          </div>
        </div>

        {/* Fields */}
        <div style={{ padding: '0' }}>
          {/* To */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
            <label style={{ fontSize: '.73rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: 48, paddingTop: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>To</label>
            <div style={{ flex: 1 }}>
              <EmailChips list={to} setList={setTo} input={toInput} setInput={setToInput} placeholder="Add recipient emails…" />
            </div>
          </div>

          {/* CC */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
            <label style={{ fontSize: '.73rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: 48, paddingTop: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>CC</label>
            <div style={{ flex: 1 }}>
              <EmailChips list={cc} setList={setCc} input={ccInput} setInput={setCcInput} placeholder="Add CC emails…" />
            </div>
          </div>

          {/* From (read-only) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
            <label style={{ fontSize: '.73rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: 48, textTransform: 'uppercase', letterSpacing: '.04em' }}>From</label>
            <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{user?.name} &lt;{user?.email}&gt;</span>
          </div>

          {/* Subject */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
            <label style={{ fontSize: '.73rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: 48, textTransform: 'uppercase', letterSpacing: '.04em' }}>Subj</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '.85rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit', background: 'transparent' }}
            />
          </div>

          {/* Body */}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            style={{
              width: '100%', minHeight: '210px', padding: '14px 16px',
              border: 'none', outline: 'none', resize: 'vertical',
              fontSize: '.8rem', fontFamily: 'inherit', color: 'var(--text)',
              lineHeight: 1.7, background: 'var(--surface)',
            }}
          />
        </div>

        {/* Changes diff summary */}
        {changes.length > 0 && (
          <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#f0f7ff', border: '1px solid #93c5fd', borderRadius: 8 }}>
            <div style={{ fontSize: '.68rem', fontWeight: 700, color: '#1a56db', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>Changes Summary</div>
            {changes.map((c, i) => (
              <div key={i} style={{ fontSize: '.75rem', color: 'var(--text-2)', marginBottom: 3 }}>
                <span style={{ fontWeight: 600 }}>{c.field}:</span>{' '}
                <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{c.from || '—'}</span>
                <span style={{ color: 'var(--text-muted)' }}> → </span>
                <span style={{ color: '#059669', fontWeight: 600 }}>{c.to || '—'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 10, padding: '12px 16px',
          borderTop: '1px solid var(--border)', background: 'var(--surface-2)',
          borderRadius: '0 0 14px 14px', alignItems: 'center',
        }}>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Discard</button>
          <button onClick={() => window.open(buildMailto())} className="btn btn-secondary btn-sm">
            📤 Open in Outlook
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleSend}
            disabled={sending}
            className="btn btn-primary"
            style={{ gap: 8, background: isCompletion ? '#059669' : '' }}
          >
            {sending ? 'Sending…' : isCompletion ? '📨 Send Update' : '📨 Send Approval Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
