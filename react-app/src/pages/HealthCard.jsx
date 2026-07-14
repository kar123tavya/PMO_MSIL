import React, { useState, useEffect, useMemo, useRef } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { useProjects } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import html2canvas from 'html2canvas'
import pptxgen from 'pptxgenjs'

const DIVISIONS = ['MQ', 'ND', 'PQ-MP', 'PQ-NPD', 'COP', 'PDS', 'VI', 'VU', 'MA', 'VQ']
const CATEGORIES = ['GenAI', 'Analytics & Digital', 'Bots', 'Dashboard', 'PowerApps & Portal']

export default function HealthCard() {
  const { user, can } = useAuth()
  const { projects } = useProjects()
  
  const [activeDiv, setActiveDiv] = useState(user?.division && DIVISIONS.includes(user.division) ? user.division : 'MQ')
  const [activeMonth, setActiveMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  
  const cardRef = useRef(null)

  useEffect(() => {
    fetchHealthCard()
  }, [activeDiv, activeMonth])

  async function fetchHealthCard() {
    setLoading(true)
    try {
      const res = await api.get(`/healthcard/${activeDiv}/${activeMonth}`)
      setData(res.data.data || {})
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      await api.put(`/healthcard/${activeDiv}/${activeMonth}`, { data })
      setEditMode(false)
      alert('Health card saved successfully!')
    } catch (e) {
      alert('Failed to save: ' + (e.response?.data?.error || e.message))
    }
  }

  const handleChange = (key, val) => {
    setData(prev => ({ ...prev, [key]: val }))
  }

  // --- Computed Stats from Live Projects ---
  const divProjects = useMemo(() => projects.filter(p => p.division === activeDiv), [projects, activeDiv])
  const liveProjects = divProjects.filter(p => p.status === 'Live')
  const ongoingProjects = divProjects.filter(p => p.status !== 'Live' && p.status !== 'Cancelled' && p.status !== 'On Hold')
  
  const getCatCounts = (cat) => {
    const pList = divProjects.filter(p => p.category === cat)
    return {
      live: pList.filter(p => p.status === 'Live').length,
      ongoing: pList.filter(p => p.status !== 'Live' && p.status !== 'Cancelled' && p.status !== 'On Hold').length,
      liveNames: pList.filter(p => p.status === 'Live').map(p => p.project),
      ongoingNames: pList.filter(p => p.status !== 'Live' && p.status !== 'Cancelled' && p.status !== 'On Hold').map(p => p.project)
    }
  }

  const flagshipLive = liveProjects.filter(p => p.flagship)
  const flagshipOngoing = ongoingProjects.filter(p => p.flagship)

  const totalUseCases = divProjects.reduce((sum, p) => sum + (parseInt(p.useCases) || 0), 0)

  const canEdit = can('manage_users') || (user?.division === activeDiv && ['pic', 'tl', 'sic', 'dpm'].includes(user?.role))

  // --- Download HTML ---
  const downloadHtml = () => {
    if (!cardRef.current) return
    const htmlContent = `
      <html>
      <head>
        <title>Health Card - ${activeDiv} - ${activeMonth}</title>
        <style>
          body { font-family: 'Inter', sans-serif; background: #fff; padding: 20px; }
          .card-wrapper { max-width: 1400px; margin: 0 auto; border: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <div class="card-wrapper">
          ${cardRef.current.innerHTML}
        </div>
      </body>
      </html>
    `
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `HealthCard_${activeDiv}_${activeMonth}.html`
    link.click()
  }

  // --- Download PPTX ---
  const downloadPptx = async () => {
    if (!cardRef.current) return
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      
      const pptx = new pptxgen()
      pptx.layout = 'LAYOUT_16x9'
      const slide = pptx.addSlide()
      
      slide.addImage({ data: imgData, x: 0, y: 0, w: '100%', h: '100%' })
      pptx.writeFile({ fileName: `HealthCard_${activeDiv}_${activeMonth}.pptx` })
    } catch (e) {
      alert('Failed to generate PPT: ' + e.message)
    }
  }

  // Define some helper styles for the complex layout
  const boxStyle = { border: '1.5px solid #1e3a8a', borderRadius: 8, padding: 8, background: '#fff' }
  const boxTitle = { fontSize: '0.85rem', fontWeight: 700, color: '#1e40af', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }
  
  return (
    <div className="page">
      <Sidebar />
      <main className="main-content">
        <Header title="Management Health Card" />
        
        <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>DIVISION</label><br />
            <select className="input" value={activeDiv} onChange={e => setActiveDiv(e.target.value)} style={{ padding: '6px 12px' }}>
              {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>MONTH</label><br />
            <input type="month" className="input" value={activeMonth} onChange={e => setActiveMonth(e.target.value)} style={{ padding: '6px 12px' }} />
          </div>
          <div style={{ flex: 1 }} />
          {canEdit && (
            <button className="btn btn-primary" onClick={() => editMode ? handleSave() : setEditMode(true)}>
              {editMode ? '💾 Save Changes' : '✏️ Edit Card'}
            </button>
          )}
          {editMode && <button className="btn btn-secondary" onClick={() => { setEditMode(false); fetchHealthCard(); }}>Cancel</button>}
          <button className="btn btn-secondary" onClick={downloadHtml}>⬇️ HTML</button>
          <button className="btn btn-secondary" onClick={downloadPptx}>⬇️ PPTX</button>
        </div>

        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div> : (
          <div style={{ overflowX: 'auto', background: '#e2e8f0', padding: 20, borderRadius: 12 }}>
            
            {/* THE ACTUAL HEALTH CARD */}
            <div ref={cardRef} style={{ width: 1200, minHeight: 700, background: '#f8fafc', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              
              {/* Header Bar */}
              <div style={{ display: 'flex', background: '#1e293b', color: '#fff', padding: '16px 24px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>Digitalization – Management Summary</h1>
                  <div style={{ fontSize: '1.1rem', color: '#cbd5e1', marginTop: 4 }}>
                    {activeDiv} Division | FY {parseInt(activeMonth.split('-')[0])}-{parseInt(activeMonth.split('-')[0])+1}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ background: '#334155', border: '1px solid #475569', borderRadius: 8, padding: '8px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>{liveProjects.length}</div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>Total Live Projects</div>
                  </div>
                  <div style={{ background: '#334155', border: '1px solid #475569', borderRadius: 8, padding: '8px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>
                      {editMode ? (
                         <input type="text" value={data.efficiency || ''} onChange={e=>handleChange('efficiency', e.target.value)} style={{ width: 60, textAlign:'center', background:'transparent', color:'#38bdf8', border:'1px solid #475569', fontSize:'1.4rem' }} />
                      ) : (data.efficiency || '0%')}
                    </div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>Efficiency Improvement</div>
                  </div>
                </div>
              </div>

              {/* Body Columns */}
              <div style={{ display: 'flex', gap: 16, padding: 16 }}>
                
                {/* LEFT COLUMN: Categories */}
                <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ textAlign: 'center', fontWeight: 800, color: '#475569', letterSpacing: 1, paddingBottom: 4 }}>CURRENT STATUS</div>
                  
                  {CATEGORIES.map(cat => {
                    const counts = getCatCounts(cat)
                    return (
                      <div key={cat} style={{ ...boxStyle, display: 'flex', gap: 12 }}>
                        <div style={{ flex: '0 0 100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e2e8f0', paddingRight: 8 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>{cat}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                           <div style={{ textAlign: 'center' }}>
                             <div style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, margin: '0 auto' }}>
                               {counts.live}
                             </div>
                             <div style={{ fontSize: '0.6rem', fontWeight: 600, marginTop: 4 }}>Live</div>
                           </div>
                           <div style={{ textAlign: 'center' }}>
                             <div style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: 6, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, margin: '0 auto' }}>
                               {counts.ongoing}
                             </div>
                             <div style={{ fontSize: '0.6rem', fontWeight: 600, marginTop: 4 }}>Ongoing</div>
                           </div>
                        </div>
                        <div style={{ flex: 1, fontSize: '0.65rem', color: '#475569', paddingLeft: 8 }}>
                          {counts.live > 0 && <div><strong style={{color:'#166534'}}>Live:</strong> {counts.liveNames.join(', ')}</div>}
                          {counts.ongoing > 0 && <div style={{marginTop:4}}><strong style={{color:'#b45309'}}>Ongoing:</strong> {counts.ongoingNames.join(', ')}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* CENTER COLUMN: Benefits */}
                <div style={{ flex: '0 0 25%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ textAlign: 'center', fontWeight: 800, color: '#475569', letterSpacing: 1, paddingBottom: 4 }}>BENEFITS</div>
                  
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1, ...boxStyle, textAlign: 'center', padding: '12px 4px', background: '#f0fdfa', borderColor: '#0f766e' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f766e' }}>{totalUseCases}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#115e59', textTransform: 'uppercase' }}>Use Cases</div>
                    </div>
                    <div style={{ flex: 1, ...boxStyle, textAlign: 'center', padding: '12px 4px', background: '#f0fdf4', borderColor: '#166534' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {editMode ? <input type="text" value={data.mrSavings || ''} onChange={e=>handleChange('mrSavings', e.target.value)} style={{ width: '100%', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 800 }} placeholder="₹ / MRs" /> : (data.mrSavings || '-')}
                      </div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#14532d', textTransform: 'uppercase' }}>MRs Savings</div>
                    </div>
                  </div>

                  <div style={{ ...boxStyle, flex: 1 }}>
                    <div style={boxTitle}>🚀 Initiatives</div>
                    {editMode ? (
                      <textarea value={data.initiatives || ''} onChange={e=>handleChange('initiatives', e.target.value)} style={{ width: '100%', height: '80%', border: 'none', background: 'transparent', fontSize: '0.75rem', resize: 'none' }} placeholder="List initiatives..." />
                    ) : (
                      <div style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.5 }}>{data.initiatives || 'No initiatives recorded.'}</div>
                    )}
                  </div>
                  
                  <div style={{ ...boxStyle, height: 180 }}>
                    <div style={boxTitle}>Investment Vs Savings</div>
                    {editMode ? (
                      <textarea value={data.investmentNote || ''} onChange={e=>handleChange('investmentNote', e.target.value)} style={{ width: '100%', height: '70%', border: 'none', background: 'transparent', fontSize: '0.7rem', resize: 'none' }} placeholder="Note or tabular data..." />
                    ) : (
                      <div style={{ fontSize: '0.7rem', whiteSpace: 'pre-wrap', color: '#334155' }}>{data.investmentNote || 'Chart data placeholder'}</div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Way Forward */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ textAlign: 'center', fontWeight: 800, color: '#475569', letterSpacing: 1, paddingBottom: 4 }}>WAY FORWARD</div>
                  
                  <div style={{ ...boxStyle }}>
                    <div style={{ ...boxTitle, color: '#b91c1c', borderColor: '#fca5a5' }}>🚩 Flagship Projects</div>
                    <div style={{ fontSize: '0.7rem', color: '#475569', padding: '0 8px' }}>
                      <ol style={{ margin: 0, paddingLeft: 16 }}>
                        {flagshipLive.map(p => <li key={p._key} style={{ marginBottom: 4 }}><strong style={{color:'#166534'}}>{p.project}</strong> (Live)</li>)}
                        {flagshipOngoing.map(p => <li key={p._key} style={{ marginBottom: 4 }}><strong style={{color:'#b45309'}}>{p.project}</strong> (Ongoing)</li>)}
                      </ol>
                      {flagshipLive.length === 0 && flagshipOngoing.length === 0 && <span>None currently.</span>}
                    </div>
                  </div>

                  <div style={{ ...boxStyle, flex: 1, borderColor: '#166534' }}>
                    <div style={{ ...boxTitle, color: '#166534' }}>✅ Key Updates & Way Forward</div>
                    {editMode ? (
                      <textarea value={data.keyUpdates || ''} onChange={e=>handleChange('keyUpdates', e.target.value)} style={{ width: '100%', height: '80%', border: 'none', background: 'transparent', fontSize: '0.75rem', resize: 'none' }} placeholder="> Update 1&#10;> Update 2" />
                    ) : (
                      <div style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.5 }}>{data.keyUpdates || 'No key updates recorded.'}</div>
                    )}
                  </div>
                  
                  <div style={{ ...boxStyle, background: '#f8fafc' }}>
                     <div style={boxTitle}>Support from ND / Divisions</div>
                     {editMode ? (
                      <textarea value={data.supportRequired || ''} onChange={e=>handleChange('supportRequired', e.target.value)} style={{ width: '100%', height: 60, border: 'none', background: 'transparent', fontSize: '0.75rem', resize: 'none' }} placeholder="Required support..." />
                    ) : (
                      <div style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.5 }}>{data.supportRequired || '-'}</div>
                    )}
                  </div>

                </div>

              </div>
              
              {/* Footer text */}
              <div style={{ position: 'absolute', bottom: 12, right: 24, fontSize: '0.6rem', color: '#94a3b8' }}>
                Generated by PMO Dashboard System — Maruti Suzuki India Limited
              </div>
            </div>
            
          </div>
        )}
      </main>
    </div>
  )
}
