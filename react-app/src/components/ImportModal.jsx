import React, { useState, useRef } from 'react'
import Modal from './Modal'
import { useToast } from '../context/ToastContext'

export default function ImportModal({ onClose, onImported }) {
  const { showToast } = useToast()
  const fileRef = useRef(null)
  const [file,     setFile]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setResult(null)
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const session = sessionStorage.getItem('pmo_session')
      const token = session ? JSON.parse(session).token : ''

      const formData = new FormData()
      formData.append('file', file)

      const res  = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Import failed', 'error')
        setResult({ error: data.error })
      } else {
        setResult(data)
        showToast(`✓ Imported ${data.imported} project(s). Skipped: ${data.skipped}`, 'success')
        if (onImported) onImported()
      }
    } catch (err) {
      showToast('Network error during import', 'error')
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.name.match(/\.(xlsx|xls)$/i)) { setFile(f); setResult(null) }
  }

  return (
    <Modal open title="Import Projects from Excel" onClose={onClose} size="md"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleUpload} disabled={!file || loading}>
          {loading ? 'Importing…' : 'Import'}
        </button>
      </>}
    >
      {/* Instructions */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 18, fontSize: '.8rem', color: '#1e40af' }}>
        <strong>Format:</strong> Upload any <code>.xlsx</code> or <code>.xls</code> file. The first row must be column headers.
        Column names are matched flexibly (case-insensitive). Use the <strong>Column Reference</strong> sheet from the Export file as your import template.
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${file ? 'var(--primary)' : 'var(--border-strong)'}`,
          borderRadius: 10, padding: '32px 24px',
          textAlign: 'center', cursor: 'pointer',
          background: file ? 'var(--primary-light)' : 'var(--surface-2)',
          transition: 'all .2s', marginBottom: 18,
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>{file ? '📊' : '📂'}</div>
        {file ? (
          <>
            <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '.9rem' }}>{file.name}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB — Click to change file</div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Drag & drop your Excel file here</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-light)', marginTop: 4 }}>or click to browse — .xlsx, .xls only</div>
          </>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
      </div>

      {/* Result */}
      {result && !result.error && (
        <div style={{ background: '#dcfce7', border: '1px solid #4ade80', borderRadius: 8, padding: '12px 16px', fontSize: '.82rem' }}>
          <div style={{ fontWeight: 700, color: '#166534', marginBottom: 6 }}>
            ✓ Import Complete: {result.imported} imported, {result.skipped} skipped
          </div>
          {result.errors?.length > 0 && (
            <div style={{ color: '#854d0e', marginTop: 8 }}>
              <strong>Warnings ({result.errors.length}):</strong>
              <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                {result.errors.map((e, i) => <li key={i} style={{ fontSize: '.72rem' }}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      {result?.error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', fontSize: '.82rem', color: '#991b1b' }}>
          ✗ {result.error}
        </div>
      )}

      {/* Template tip */}
      <div style={{ marginTop: 16, fontSize: '.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        💡 <strong>Tip:</strong> First export your current data to get a properly-formatted template Excel file with the correct column headers and a "Column Reference" tab.
      </div>
    </Modal>
  )
}
