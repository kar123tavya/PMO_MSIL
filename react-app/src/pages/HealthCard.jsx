import React, { useState, useEffect, useMemo, useRef } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { useProjects } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import html2canvas from 'html2canvas'
import pptxgen from 'pptxgenjs'

const DIVISIONS = ['MQ', 'ND', 'PQ-MP', 'PQ-NPD', 'COP', 'PDS', 'VI', 'VU', 'MA', 'VQ']

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
  
  const getCounts = (filterFn) => {
    const pList = divProjects.filter(filterFn)
    return {
      live: pList.filter(p => p.status === 'Live').length,
      ongoing: pList.filter(p => p.status !== 'Live' && p.status !== 'Cancelled' && p.status !== 'On Hold').length,
      liveNames: pList.filter(p => p.status === 'Live').map(p => p.project).join(', '),
      ongoingNames: pList.filter(p => p.status !== 'Live' && p.status !== 'Cancelled' && p.status !== 'On Hold').map(p => p.project).join(', ')
    }
  }

  const flagshipLive = liveProjects.filter(p => p.flagship)
  const flagshipOngoing = ongoingProjects.filter(p => p.flagship)
  const allFlagships = [...flagshipLive, ...flagshipOngoing]

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

  const boxStyle = { border: '1.5px solid #1e3a8a', borderRadius: 8, padding: 8, background: '#fff' }
  const boxTitle = { fontSize: '0.85rem', fontWeight: 800, color: '#1e40af', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }
  
  const renderCategoryRow = (title, icon, filterFn, isStartup, dataKey) => {
    const counts = getCounts(filterFn)
    return (
      <div style={{ ...boxStyle, display: 'flex', flexDirection: 'column', gap: 6, borderColor: '#cbd5e1' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: '1.4rem' }}>{icon}</div>
          <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>{title}</div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>{isStartup ? 'PILOT' : 'LIVE'}</span>
              <div style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                {counts.live}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>{isStartup ? 'CONVERTED' : 'ONGOING'}</span>
              <div style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                {counts.ongoing}
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.65rem', color: '#475569', paddingLeft: 34 }}>
          {counts.live > 0 && <div style={{ marginBottom: 2 }}><strong style={{color:'#166534'}}>{isStartup ? 'Pilot:' : 'Live:'}</strong> {counts.liveNames}</div>}
          {counts.ongoing > 0 && <div><strong style={{color:'#b45309'}}>{isStartup ? 'Converted:' : 'Ongoing:'}</strong> {counts.ongoingNames}</div>}
          
          {(editMode || data[dataKey]) && (
            <div style={{ marginTop: 4 }}>
              {editMode ? (
                <textarea 
                  value={data[dataKey] || ''} 
                  onChange={e => handleChange(dataKey, e.target.value)} 
                  style={{ width: '100%', minHeight: 30, fontSize: '0.65rem', padding: '4px 6px', borderRadius: 4, border: '1px solid #cbd5e1', resize: 'vertical' }}
                  placeholder="Enter current status notes..." 
                />
              ) : (
                <div style={{ fontSize: '0.65rem', color: '#334155', fontStyle: 'italic', marginTop: 2, whiteSpace: 'pre-wrap' }}>
                  {data[dataKey]}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Usage Progress Bar Mockup */}
        <div style={{ paddingLeft: 34, marginTop: 4 }}>
          <div style={{ display: 'flex', fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', gap: 2, marginBottom: 2 }}>
            <div style={{ flex: 1 }}>{'<50%'}</div>
            <div style={{ flex: 1, textAlign: 'center' }}>{'50-80%'}</div>
            <div style={{ flex: 1, textAlign: 'right' }}>{'>80%'}</div>
          </div>
          <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', background: '#e2e8f0' }}>
            <div style={{ flex: 1, background: '#ef4444', opacity: 0.8 }}></div>
            <div style={{ flex: 1, background: '#eab308', opacity: 0.8 }}></div>
            <div style={{ flex: 1, background: '#22c55e', opacity: 0.8 }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Header title="Management Health Card" />
        
        <div style={{ padding: '24px 36px', overflowY: 'auto', flex: 1 }}>
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
            <div style={{ width: '100%', overflowX: 'auto', background: '#e2e8f0', padding: 20, borderRadius: 12 }}>
              
              {/* THE ACTUAL HEALTH CARD */}
              <div ref={cardRef} style={{ minWidth: 1200, width: 1200, minHeight: 675, background: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                
                {/* Header Bar */}
                <div style={{ display: 'flex', background: '#1e293b', color: '#fff', padding: '16px 24px', alignItems: 'center', minHeight: 90 }}>
                  <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', letterSpacing: 0.5 }}>Digitalization – Management Summary</h1>
                    <div style={{ fontSize: '1rem', color: '#cbd5e1', marginTop: 4, fontWeight: 500 }}>
                      QA-{activeDiv} Division | FY {parseInt(activeMonth.split('-')[0])}-{parseInt(activeMonth.split('-')[0])+1}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ background: '#334155', borderRadius: 8, padding: '12px 24px', textAlign: 'center', minWidth: 160 }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1 }}>{liveProjects.length}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, color: '#e2e8f0' }}>Total Live Projects</div>
                    </div>
                    <div style={{ background: '#334155', borderRadius: 8, padding: '12px 24px', textAlign: 'center', minWidth: 160 }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1, display: 'flex', justifyContent: 'center' }}>
                        {editMode ? (
                           <input type="text" value={data.efficiency || ''} onChange={e=>handleChange('efficiency', e.target.value)} style={{ width: 80, textAlign:'center', background:'transparent', color:'#38bdf8', border:'1px solid #475569', fontSize:'1.6rem', fontWeight: 800 }} />
                        ) : (data.efficiency || '0%')}
                      </div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, color: '#e2e8f0' }}>Efficiency Improvement</div>
                    </div>
                  </div>
                </div>

                {/* Body Columns */}
                <div style={{ display: 'flex', gap: 16, padding: '16px 20px' }}>
                  
                  {/* LEFT COLUMN: Categories */}
                  <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ textAlign: 'center', fontWeight: 800, color: '#334155', letterSpacing: 1, paddingBottom: 4, fontSize: '0.9rem' }}>CURRENT STATUS</div>
                    
                    {renderCategoryRow('AI & Gen AI', '🧠', p => p.category === 'GenAI', false, 'statusAiGenai')}
                    {renderCategoryRow('Analytics & IOT Projects', '📊', p => p.category === 'Analytics & Digital', false, 'statusAnalytics')}
                    {renderCategoryRow('Startup Engagements', '💡', p => p.theme === 'Startup collaboration for technology adoption', true, 'statusStartup')}
                    {renderCategoryRow('Visualization (Dashboards)', '🖥️', p => p.category === 'Dashboard', false, 'statusDashboards')}
                    {renderCategoryRow('Digitalization (Applications & Automation)', '🤖', p => p.category === 'PowerApps & Portal' || p.category === 'Bots', false, 'statusDigitalization')}
                  </div>

                  {/* CENTER COLUMN: Benefits */}
                  <div style={{ flex: '0 0 25%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ textAlign: 'center', fontWeight: 800, color: '#334155', letterSpacing: 1, paddingBottom: 4, fontSize: '0.9rem' }}>BENEFITS</div>
                    
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1, ...boxStyle, textAlign: 'center', padding: '12px 4px', background: '#f0fdfa', borderColor: '#14b8a6' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f766e', lineHeight: 1 }}>{totalUseCases}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', marginTop: 4 }}>Use Cases</div>
                      </div>
                      <div style={{ flex: 1, ...boxStyle, textAlign: 'center', padding: '12px 4px', background: '#f0fdf4', borderColor: '#22c55e' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {editMode ? <input type="text" value={data.mrSavings || ''} onChange={e=>handleChange('mrSavings', e.target.value)} style={{ width: '100%', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 800, fontSize: '1.2rem', color: '#166534' }} placeholder="₹ / MRs" /> : (data.mrSavings || '-')}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#14532d', textTransform: 'uppercase', marginTop: 4 }}>MRs Cost Saving</div>
                      </div>
                    </div>

                    <div style={{ ...boxStyle, textAlign: 'center', padding: '12px 4px', background: '#fffbeb', borderColor: '#f59e0b' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b45309', height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {editMode ? <input type="text" value={data.defectDetection || ''} onChange={e=>handleChange('defectDetection', e.target.value)} style={{ width: '100%', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 800, fontSize: '1.2rem', color: '#b45309' }} placeholder="Defect Count" /> : (data.defectDetection || '-')}
                      </div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', marginTop: 4 }}>Proactive Defect Detection</div>
                    </div>

                    <div style={{ ...boxStyle, flex: 1, borderColor: '#818cf8', background: '#faf5ff' }}>
                      <div style={{ ...boxTitle, color: '#4338ca', borderColor: '#c7d2fe' }}>🚀 Initiatives</div>
                      {editMode ? (
                        <textarea value={data.initiatives || ''} onChange={e=>handleChange('initiatives', e.target.value)} style={{ width: '100%', height: '70%', border: 'none', background: 'transparent', fontSize: '0.75rem', resize: 'none' }} placeholder="List initiatives..." />
                      ) : (
                        <div style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.5 }}>{data.initiatives || 'No initiatives recorded.'}</div>
                      )}
                    </div>
                    
                    <div style={{ ...boxStyle, height: 140 }}>
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
                    <div style={{ textAlign: 'center', fontWeight: 800, color: '#334155', letterSpacing: 1, paddingBottom: 4, fontSize: '0.9rem' }}>WAY FORWARD</div>
                    
                    <div style={{ ...boxStyle, borderColor: '#ef4444' }}>
                      <div style={{ ...boxTitle, color: '#b91c1c', borderColor: '#fca5a5' }}>🚩 Flagship Projects</div>
                      <div style={{ fontSize: '0.75rem', color: '#334155', padding: '0 8px' }}>
                        <ol style={{ margin: 0, paddingLeft: 16 }}>
                          {allFlagships.map((p, i) => (
                            <li key={p._key} style={{ marginBottom: 6, fontWeight: 600 }}>
                              {p.project} <span style={{ color: '#0ea5e9', fontWeight: 700 }}>[Target: {p.actualEndDate || p.targetEndDate || 'TBD'}]</span>
                            </li>
                          ))}
                        </ol>
                        {allFlagships.length === 0 && <span style={{ color: '#64748b' }}>None currently.</span>}
                      </div>
                    </div>

                    <div style={{ ...boxStyle, flex: 1, borderColor: '#22c55e', background: '#f0fdf4' }}>
                      <div style={{ ...boxTitle, color: '#166534', borderColor: '#bbf7d0', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem', color: '#22c55e' }}>☑</span> Key Updates & Way Forward
                      </div>
                      {editMode ? (
                        <textarea value={data.keyUpdates || ''} onChange={e=>handleChange('keyUpdates', e.target.value)} style={{ width: '100%', height: '80%', border: 'none', background: 'transparent', fontSize: '0.75rem', resize: 'none', fontWeight: 500 }} placeholder="> Update 1&#10;> Update 2" />
                      ) : (
                        <div style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.6, fontWeight: 500 }}>{data.keyUpdates || 'No key updates recorded.'}</div>
                      )}
                    </div>
                    
                    <div style={{ padding: '0 8px' }}>
                       <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: 4 }}>Support from ND / Divisions</div>
                       {editMode ? (
                        <textarea value={data.supportRequired || ''} onChange={e=>handleChange('supportRequired', e.target.value)} style={{ width: '100%', height: 40, border: '1px solid #cbd5e1', borderRadius: 6, padding: 6, fontSize: '0.75rem', resize: 'none' }} placeholder="Required support..." />
                      ) : (
                        <div style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#64748b', lineHeight: 1.4 }}>{data.supportRequired || '-'}</div>
                      )}
                    </div>

                  </div>

                </div>
                
                {/* Footer text */}
                <div style={{ position: 'absolute', bottom: 12, right: 24, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                  Generated by PMO Dashboard System — Maruti Suzuki India Limited
                </div>
              </div>
              
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
