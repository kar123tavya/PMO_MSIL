import React, { useState, useMemo, useRef, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Header  from '../components/Header'
import api from '../api/client'
import { useProjects } from '../context/ProjectContext'
import html2canvas from 'html2canvas'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import ColumnManager from '../components/ColumnManager'

const IL_COLORS = ['#7c3aed','#0369a1','#15803d','#b45309','#b91c1c']
const IL_BGS    = ['#ede9fe','#e0f2fe','#dcfce7','#fef9c3','#fee2e2']
const ROW_H_PH  = 44
const ROW_H_ST  = 38
const ROW_H_PRJ = 34

const MODES = {
  weekly:    { cellW: 36, step: 'week' },
  monthly:   { cellW: 60, step: 'month' },
  quarterly: { cellW: 80, step: 'quarter' },
  yearly:    { cellW: 120, step: 'year' },
}

function fmtDateShort(str) {
  if (!str) return '—'
  const d = new Date(str)
  if (isNaN(d)) return str
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function startOf(d, step) {
  const r = new Date(d)
  if (step === 'week') { r.setHours(0,0,0,0); const diff = r.getDay()===0?-6:1-r.getDay(); r.setDate(r.getDate()+diff) }
  else if (step === 'month') { r.setDate(1); r.setHours(0,0,0,0) }
  else if (step === 'quarter') { r.setMonth(Math.floor(r.getMonth()/3)*3); r.setDate(1); r.setHours(0,0,0,0) }
  else if (step === 'year') { r.setMonth(0); r.setDate(1); r.setHours(0,0,0,0) }
  return r
}

function addStep(d, step) {
  const r = new Date(d)
  if (step === 'week') r.setDate(r.getDate()+7)
  else if (step === 'month') r.setMonth(r.getMonth()+1)
  else if (step === 'quarter') r.setMonth(r.getMonth()+3)
  else if (step === 'year') r.setFullYear(r.getFullYear()+1)
  return r
}

function buildCols(minMs, maxMs, step) {
  const cols = []
  let cur = startOf(new Date(minMs), step)
  const max = new Date(maxMs)
  while (cur <= max) {
    let lbl = '', group = ''
    if (step==='week') { lbl = cur.getDate()+' '+cur.toLocaleDateString('en-US',{month:'short'}); group = cur.getFullYear() }
    else if (step==='month') { lbl = cur.toLocaleDateString('en-US',{month:'short'}); group = cur.getFullYear() }
    else if (step==='quarter') { lbl = 'Q'+(Math.floor(cur.getMonth()/3)+1); group = cur.getFullYear() }
    else if (step==='year') { lbl = cur.getFullYear(); group = 'Years' }
    cols.push({ ms: cur.getTime(), date: new Date(cur), label: lbl, group })
    cur = addStep(cur, step)
  }
  return cols
}

function dateToX(dateInput, cols, cellW) {
  if (!dateInput || !cols || !cols.length) return 0
  const d = new Date(dateInput)
  if (isNaN(d)) return 0
  d.setHours(0,0,0,0)
  for (let i = 0; i < cols.length; i++) {
    const colStart = cols[i].date
    const colEnd   = cols[i+1] ? cols[i+1].date : addStep(colStart, 'month')
    if (d >= colStart && d < colEnd) {
      const frac = (d - colStart) / (colEnd - colStart)
      return (i + frac) * cellW
    }
  }
  if (d < cols[0].date) return 0
  return cols.length * cellW
}

export default function Gantt() {
  const { projects, loading } = useProjects()
  const { showToast } = useToast()
  const { user } = useAuth()
  const [search,       setSearch]       = useState('')
  const [filterDiv,    setFilterDiv]    = useState(user?.role === 'pic' ? (user?.division || '') : '')
  const [expanded,     setExpanded]     = useState({})
  const [viewMode,     setViewMode]     = useState('monthly')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportProjKey,   setExportProjKey]   = useState('')
  const [exporting,    setExporting]    = useState(false)
  const [isolatedProjKey, setIsolatedProjKey] = useState(null)
  const [showColMgr,   setShowColMgr]   = useState(false)
  const [customCols,   setCustomCols]   = useState([])

  const sidebarRef    = useRef(null)
  const ganttBodyRef  = useRef(null)
  const ganttXScrollRef = useRef(null)

  useEffect(() => {
    api.get('/settings/columns').then(({ data }) => {
      if (Array.isArray(data)) setCustomCols(data.filter(c => c.views.includes('gantt') && c.status === 'approved'))
    }).catch(console.error)
  }, [showColMgr])

  function handleScroll(e) {
    if (e.target === sidebarRef.current && ganttBodyRef.current) ganttBodyRef.current.scrollTop = sidebarRef.current.scrollTop
    else if (e.target === ganttBodyRef.current && sidebarRef.current) sidebarRef.current.scrollTop = ganttBodyRef.current.scrollTop
  }

  const filtered = useMemo(() =>
    projects.filter(p =>
      (!search || (p.project||'').toLowerCase().includes(search.toLowerCase())) &&
      (!filterDiv || p.division === filterDiv) &&
      (!isolatedProjKey || p._key === isolatedProjKey)
    ),
    [projects, search, filterDiv, isolatedProjKey]
  )

  // Fixed 4 years before and 4 years after today
  const { cols, totalW, todayX, cw } = useMemo(() => {
    const now = new Date()
    const mn = new Date(now.getFullYear() - 4, 0, 1).getTime()
    const mx = new Date(now.getFullYear() + 4, 11, 31).getTime()
    const step = MODES[viewMode].step
    const cellW = MODES[viewMode].cellW
    const cs = buildCols(mn, mx, step)
    const tx = dateToX(now, cs, cellW)
    return { cols: cs, totalW: cs.length * cellW, todayX: tx, cw: cellW }
  }, [viewMode])

  // Scroll to today on load / viewMode change
  useEffect(() => {
    if (ganttXScrollRef.current && todayX > 0) {
      const containerW = ganttXScrollRef.current.clientWidth
      ganttXScrollRef.current.scrollLeft = Math.max(0, todayX - containerW / 2)
    }
  }, [todayX, cols])

  const groups = useMemo(() => {
    const g = []
    cols.forEach(c => { const l = g[g.length-1]; if (l && l.label === c.group) l.span++; else g.push({label:c.group, span:1}) })
    return g
  }, [cols])

  const todayStr = new Date().toISOString().slice(0,10)

  function togglePhase(pKey, ilId) { setExpanded(e => ({...e, [pKey+'_'+ilId]: !e[pKey+'_'+ilId]})) }

  function bar(startStr, endStr, ilIdx, h, done, isTarget=false, projName='', topOffset='50%') {
    const x1 = dateToX(startStr, cols, cw)
    const x2 = dateToX(endStr, cols, cw)
    const w  = Math.max(x2 - x1, cw * 0.5)
    const overdue = !done && endStr && endStr < todayStr
    let clr = IL_COLORS[ilIdx % IL_COLORS.length]
    let bg  = ''
    if (isTarget) {
      clr = '#94a3b8'
      bg  = 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 8px)'
    } else {
      bg = done ? clr : `${clr}88`
    }
    const hoverText = `${projName ? projName+'\n' : ''}${isTarget?'Target':'Actual'}: ${fmtDateShort(startStr)} → ${fmtDateShort(endStr)}`
    return (
      <div title={hoverText} style={{position:'absolute',left:x1,top:`calc(${topOffset} - ${h/2}px)`,width:w,height:h,background:bg,borderRadius:h/2,border:overdue?'2px solid #ef4444':`1px solid ${clr}`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:overdue?'0 0 6px rgba(239,68,68,0.4)':'none',cursor:'help'}}>
        {done && !isTarget && <span style={{color:'#fff',fontSize:h*0.7,lineHeight:1}}>✓</span>}
      </div>
    )
  }

  async function downloadScreenshot() {
    if (!exportProjKey) return showToast('Please select a project first', 'error')
    setExporting(true)
    setIsolatedProjKey(exportProjKey)
    setTimeout(async () => {
      try {
        const targetEl = document.getElementById('gantt-full-view')
        if (!targetEl) throw new Error('Gantt view not found')
        const canvas = await html2canvas(targetEl, { scale:2, useCORS:true, backgroundColor:'#ffffff' })
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/png')
        a.download = `Gantt_${projects.find(p=>p._key===exportProjKey)?.project.replace(/[^a-z0-9]/gi,'_')||'Project'}.png`
        a.click()
        setShowExportModal(false)
        showToast('Gantt screenshot downloaded!', 'success')
      } catch (e) {
        showToast(e.message, 'error')
      } finally {
        setIsolatedProjKey(null)
        setExporting(false)
      }
    }, 600)
  }

  if (loading) return <div className="loading-screen">Loading Gantt…</div>

  return (
    <div className="app-shell">
      <Sidebar/>
      <div className="app-main">
        <Header title="Gantt Chart" searchValue={search} onSearch={setSearch} />

        {/* Toolbar */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',background:'var(--surface)',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
          <span style={{fontWeight:600,fontSize:'0.82rem',color:'var(--text-muted)'}}>View:</span>
          <select value={viewMode} onChange={e=>setViewMode(e.target.value)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid var(--border)',fontSize:'0.8rem'}}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select value={filterDiv} onChange={e=>setFilterDiv(e.target.value)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid var(--border)',fontSize:'0.8rem'}}>
            <option value="">All Divisions</option>
            {[...new Set(projects.map(p=>p.division).filter(Boolean))].sort().map(d=>(
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <button className="btn btn-primary" style={{padding:'4px 12px',height:32,fontSize:'0.8rem'}} onClick={()=>setShowExportModal(true)}>📷 Export Snapshot</button>
          <button className="btn btn-outline" style={{padding:'4px 12px',height:32,fontSize:'0.8rem'}} onClick={()=>setShowColMgr(true)}>⚙ Columns</button>
          <span style={{marginLeft:'auto',fontSize:'0.75rem',color:'var(--text-muted)'}}>{filtered.length} project{filtered.length!==1?'s':''}</span>
        </div>

        <div id="gantt-full-view" style={{display:'flex',height:'calc(100vh - 60px - 49px)',overflow:'hidden'}}>
          {/* Left labels */}
          <div ref={sidebarRef} onScroll={handleScroll} style={{width:260,flexShrink:0,borderRight:'1px solid var(--border)',overflowY:'auto',background:'var(--surface)',overflowX:'hidden'}}>
            <div style={{height:52,display:'flex',alignItems:'center',padding:'0 12px',background:'var(--surface-2)',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'.72rem',color:'var(--text-muted)',textTransform:'uppercase',position:'sticky',top:0,zIndex:5}}>Project / Phase</div>
            {filtered.map(p=>(
              <div key={p._key}>
                <div style={{padding:'0 10px',fontWeight:700,fontSize:'.78rem',color:'var(--primary)',background:'var(--surface-2)',borderBottom:'1px solid var(--border)',height:ROW_H_PRJ,display:'flex',alignItems:'center',overflow:'hidden'}}>
                  <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.project}</span>
                </div>
                {(p.il_phases||[]).map((il,idx)=>(
                  <React.Fragment key={il.id}>
                    <div onClick={()=>togglePhase(p._key,il.id)} style={{height:ROW_H_PH,display:'flex',alignItems:'center',padding:'0 8px 0 18px',gap:6,background:IL_BGS[idx]+'66',borderBottom:'1px solid var(--border)',cursor:'pointer',fontSize:'.72rem',fontWeight:600,color:IL_COLORS[idx],overflow:'hidden'}}>
                      <span style={{fontSize:'.6rem',flexShrink:0}}>{expanded[p._key+'_'+il.id]?'▼':'▶'}</span>
                      <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{il.label}</span>
                    </div>
                    {expanded[p._key+'_'+il.id]&&(il.subtasks||[]).map((st,si)=>(
                      <div key={si} style={{height:ROW_H_ST,display:'flex',alignItems:'center',padding:'0 6px 0 32px',background:IL_BGS[idx]+'22',borderBottom:'1px solid var(--border)',fontSize:'.68rem',color:st.done?'var(--text-light)':'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textDecoration:st.done?'line-through':'none'}}>
                        {st.label||st}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            ))}
            {filtered.length===0&&<div className="no-data">No projects found.</div>}
            <div style={{height:100}}/>
          </div>

          {/* Gantt bars area */}
          <div ref={ganttXScrollRef} style={{flex:1,overflowX:'auto',position:'relative',display:'flex',flexDirection:'column'}}>
            <div style={{minWidth:totalW}}>
              {/* Year/Quarter group header */}
              <div style={{display:'flex',height:28,position:'sticky',top:0,zIndex:10,background:'var(--surface-2)',borderBottom:'1px solid var(--border)'}}>
                {groups.map((g,i)=>(
                  <div key={i} style={{width:g.span*cw,borderRight:'1px solid var(--border)',padding:'5px 6px',fontSize:'.62rem',fontWeight:700,color:'var(--text-muted)',whiteSpace:'nowrap',overflow:'hidden',flexShrink:0}}>{g.label}</div>
                ))}
              </div>
              {/* Column header */}
              <div style={{display:'flex',height:24,position:'sticky',top:28,zIndex:10,background:'var(--surface-2)',borderBottom:'2px solid var(--border)'}}>
                {cols.map((c,i)=>(
                  <div key={i} style={{width:cw,height:'100%',textAlign:'center',fontSize:'.58rem',color:'var(--text-light)',fontWeight:400,flexShrink:0,borderRight:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center'}}>{c.label}</div>
                ))}
              </div>

              {/* Scrollable rows */}
              <div ref={ganttBodyRef} onScroll={handleScroll} style={{overflowY:'auto',height:'calc(100vh - 60px - 49px - 52px)',position:'relative'}}>
                {/* Grid background + today line */}
                <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,display:'flex',pointerEvents:'none',zIndex:0}}>
                  {cols.map((c,i)=>(
                    <div key={i} style={{width:cw,borderRight:'1px solid var(--border-light)',flexShrink:0}}/>
                  ))}
                </div>
                {todayX > 0 && (
                  <div style={{position:'absolute',left:todayX,top:0,bottom:0,width:2,background:'#3b82f6',zIndex:20,pointerEvents:'none'}}>
                    <div style={{position:'absolute',top:4,left:4,background:'#3b82f6',color:'#fff',padding:'2px 6px',fontSize:'0.62rem',fontWeight:800,borderRadius:10,whiteSpace:'nowrap'}}>TODAY</div>
                  </div>
                )}

                {/* Project rows */}
                <div style={{position:'relative',zIndex:1}}>
                  {filtered.map(p=>{
                    let targetStart = null
                    ;(p.il_phases||[]).forEach(il=>{
                      if (il.startDate && (!targetStart || il.startDate < targetStart)) targetStart = il.startDate
                    })
                    return (
                      <div key={p._key} id={`gantt-proj-${p._key}`}>
                        <div style={{position:'relative',height:ROW_H_PRJ,borderBottom:'1px solid var(--border)',background:'var(--surface-2)'}}>
                          {targetStart && p.liveTarget && bar(targetStart, p.liveTarget, 0, 16, false, true, p.project, '50%')}
                        </div>
                        {(p.il_phases||[]).map((il,idx)=>{
                          const tStart = il.targetStart || il.startDate
                          const tEnd   = il.targetEnd   || il.startDate
                          const aStart = il.actualStart  || il.endDate
                          const aEnd   = il.actualEnd    || il.endDate
                          return (
                            <React.Fragment key={il.id}>
                              <div onClick={()=>togglePhase(p._key,il.id)} style={{position:'relative',height:ROW_H_PH,borderBottom:'1px solid var(--border)',background:IL_BGS[idx]+'44',cursor:'pointer'}}>
                                {tStart&&tEnd&&bar(tStart,tEnd,idx,10,false,true,`${p.project} - ${il.label}`,'30%')}
                                {aStart&&aEnd&&bar(aStart,aEnd,idx,10,(il.subtasks||[]).every(s=>s.done)&&(il.subtasks||[]).length>0,false,`${p.project} - ${il.label}`,'70%')}
                              </div>
                              {expanded[p._key+'_'+il.id]&&(il.subtasks||[]).map((st,si)=>{
                                const stTStart = st.targetStart || st.startDate
                                const stTEnd   = st.targetEnd   || st.endDate
                                const stAStart = st.actualStart || (st.done ? st.startDate : null)
                                const stAEnd   = st.actualEnd   || (st.done ? st.endDate   : null)
                                return (
                                  <div key={si} style={{position:'relative',height:ROW_H_ST,borderBottom:'1px solid var(--border)',background:IL_BGS[idx]+'22'}}>
                                    {stTStart&&stTEnd&&bar(stTStart,stTEnd,idx,8,false,true,`${p.project} - ${st.label||st}`,'30%')}
                                    {stAStart&&stAEnd&&bar(stAStart,stAEnd,idx,8,st.done,false,`${p.project} - ${st.label||st}`,'70%')}
                                  </div>
                                )
                              })}
                            </React.Fragment>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
                <div style={{height:100}}/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showExportModal && (
        <div className="modal-overlay" style={{zIndex:9999}}>
          <div className="modal-content" style={{maxWidth:400}}>
            <div className="modal-header">
              <h3>Export Gantt Image</h3>
              <button className="btn-ghost" onClick={()=>setShowExportModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Select Project to Export</label>
                <select className="input-field" value={exportProjKey} onChange={e=>setExportProjKey(e.target.value)}>
                  <option value="">-- Choose a project --</option>
                  {filtered.map(p=><option key={p._key} value={p._key}>{p.project}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{marginTop:20,display:'flex',justifyContent:'flex-end',gap:10}}>
              <button className="btn btn-ghost" onClick={()=>setShowExportModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={downloadScreenshot} disabled={!exportProjKey||exporting}>
                {exporting ? 'Generating...' : 'Download Image'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showColMgr && <ColumnManager onClose={()=>setShowColMgr(false)} />}
    </div>
  )
}
