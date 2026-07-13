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
const LABEL_W   = 260

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

  const ganttScrollRef = useRef(null)

  useEffect(() => {
    api.get('/settings/columns').then(({ data }) => {
      if (Array.isArray(data)) setCustomCols(data.filter(c => c.views.includes('gantt') && c.status === 'approved'))
    }).catch(console.error)
  }, [showColMgr])

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

  // Scroll to today on load / viewMode change — center the view on today
  useEffect(() => {
    if (ganttScrollRef.current && todayX > 0) {
      const containerW = ganttScrollRef.current.clientWidth
      // Subtract LABEL_W because the label column is inside the same scroll container
      ganttScrollRef.current.scrollLeft = Math.max(0, todayX - (containerW - LABEL_W) / 2)
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
        <Header title="Gantt Chart" />

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
          <input
            type="text"
            placeholder="🔍 Search projects..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{padding:'5px 10px',borderRadius:6,border:'1px solid var(--border)',fontSize:'0.8rem',width:200}}
          />
          <button className="btn btn-primary" style={{padding:'4px 12px',height:32,fontSize:'0.8rem'}} onClick={()=>setShowExportModal(true)}>📷 Export Snapshot</button>
          <button className="btn btn-outline" style={{padding:'4px 12px',height:32,fontSize:'0.8rem'}} onClick={()=>setShowColMgr(true)}>⚙ Columns</button>
          <span style={{marginLeft:'auto',fontSize:'0.75rem',color:'var(--text-muted)'}}>{filtered.length} project{filtered.length!==1?'s':''}</span>
        </div>

        {/*
          Single horizontally-scrollable container.
          The project name column uses position:sticky; left:0 so it stays pinned
          while the user scrolls left/right through the Gantt timeline.
        */}
        <div
          id="gantt-full-view"
          ref={ganttScrollRef}
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            height: 'calc(100vh - 60px - 49px - 49px)',
            position: 'relative',
          }}
        >
          {/* The inner content is as wide as (label column + all timeline columns) */}
          <div style={{minWidth: LABEL_W + totalW, position: 'relative'}}>

            {/* ───────── Sticky header row ───────── */}
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 30,
              display: 'flex',
              background: 'var(--surface-2)',
              borderBottom: '2px solid var(--border)',
            }}>
              {/* Top-left corner — pinned label header */}
              <div style={{
                width: LABEL_W,
                flexShrink: 0,
                position: 'sticky',
                left: 0,
                zIndex: 40,
                background: '#1e3a8a',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                borderRight: '2px solid rgba(255,255,255,0.3)',
              }}>
                <div style={{height:28, display:'flex',alignItems:'center',padding:'0 12px',fontSize:'.7rem',fontWeight:700,color:'rgba(255,255,255,0.7)',borderBottom:'1px solid rgba(255,255,255,0.2)'}}>YEAR</div>
                <div style={{height:24, display:'flex',alignItems:'center',padding:'0 12px',fontSize:'.68rem',fontWeight:800,color:'#fff'}}>PROJECT / PHASE</div>
              </div>

              {/* Timeline header columns (year groups + month/week labels) */}
              <div style={{flex:1, display:'flex', flexDirection:'column'}}>
                {/* Year group labels */}
                <div style={{display:'flex',height:28}}>
                  {groups.map((g,i)=>(
                    <div key={i} style={{width:g.span*cw,flexShrink:0,borderRight:'1px solid var(--border)',padding:'5px 6px',fontSize:'.62rem',fontWeight:700,color:'var(--text-muted)',whiteSpace:'nowrap',overflow:'hidden'}}>
                      {g.label}
                    </div>
                  ))}
                </div>
                {/* Month / week col labels */}
                <div style={{display:'flex',height:24}}>
                  {cols.map((c,i)=>(
                    <div key={i} style={{width:cw,height:'100%',textAlign:'center',fontSize:'.58rem',color:'var(--text-light)',fontWeight:400,flexShrink:0,borderRight:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ───────── Project rows ───────── */}
            {filtered.length === 0 && (
              <div className="no-data" style={{paddingLeft: LABEL_W + 20}}>No projects found.</div>
            )}

            {filtered.map(p => {
              let targetStart = null
              ;(p.il_phases||[]).forEach(il => {
                if (il.startDate && (!targetStart || il.startDate < targetStart)) targetStart = il.startDate
              })

              return (
                <div key={p._key} id={`gantt-proj-${p._key}`}>
                  {/* ── Project-level row ── */}
                  <div style={{display:'flex', borderBottom:'1px solid var(--border)'}}>
                    {/* Pinned label */}
                    <div style={{
                      width: LABEL_W,
                      flexShrink: 0,
                      position: 'sticky',
                      left: 0,
                      zIndex: 20,
                      background: 'var(--surface-2)',
                      borderRight: '2px solid var(--border)',
                      height: ROW_H_PRJ,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      overflow: 'hidden',
                    }}>
                      <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:700,fontSize:'.78rem',color:'var(--primary)'}} title={p.project}>{p.project}</span>
                    </div>
                    {/* Bar area */}
                    <div style={{flex:1, position:'relative', height:ROW_H_PRJ, minWidth: totalW}}>
                      {/* grid lines */}
                      <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,display:'flex',pointerEvents:'none'}}>
                        {cols.map((_,i)=><div key={i} style={{width:cw,flexShrink:0,borderRight:'1px solid var(--border-light)'}}/>)}
                      </div>
                      {/* Today line */}
                      {todayX > 0 && (
                        <div style={{position:'absolute',left:todayX,top:0,bottom:0,width:2,background:'#3b82f6',zIndex:10,pointerEvents:'none'}}>
                          <div style={{position:'absolute',top:2,left:3,background:'#3b82f6',color:'#fff',padding:'1px 4px',fontSize:'0.55rem',fontWeight:800,borderRadius:6,whiteSpace:'nowrap'}}>TODAY</div>
                        </div>
                      )}
                      {targetStart && p.liveTarget && bar(targetStart, p.liveTarget, 0, 16, false, true, p.project, '50%')}
                    </div>
                  </div>

                  {/* ── IL Phase rows ── */}
                  {(p.il_phases||[]).map((il,idx) => {
                    const tStart = il.targetStart || il.startDate
                    const tEnd   = il.targetEnd   || il.startDate
                    const aStart = il.actualStart  || il.endDate
                    const aEnd   = il.actualEnd    || il.endDate
                    return (
                      <React.Fragment key={il.id}>
                        <div style={{display:'flex', borderBottom:'1px solid var(--border)'}}>
                          {/* Pinned phase label */}
                          <div onClick={()=>togglePhase(p._key,il.id)} style={{
                            width: LABEL_W,
                            flexShrink: 0,
                            position: 'sticky',
                            left: 0,
                            zIndex: 20,
                            background: IL_BGS[idx]+'aa',
                            borderRight: '2px solid '+IL_COLORS[idx]+'55',
                            height: ROW_H_PH,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 8px 0 18px',
                            gap: 6,
                            cursor: 'pointer',
                            fontSize: '.72rem',
                            fontWeight: 600,
                            color: IL_COLORS[idx],
                            overflow: 'hidden',
                          }}>
                            <span style={{fontSize:'.6rem',flexShrink:0}}>{expanded[p._key+'_'+il.id]?'▼':'▶'}</span>
                            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{il.label}</span>
                          </div>
                          {/* Bar area */}
                          <div style={{flex:1, position:'relative', height:ROW_H_PH, minWidth: totalW, background: IL_BGS[idx]+'22', cursor:'pointer'}} onClick={()=>togglePhase(p._key,il.id)}>
                            <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,display:'flex',pointerEvents:'none'}}>
                              {cols.map((_,i)=><div key={i} style={{width:cw,flexShrink:0,borderRight:'1px solid var(--border-light)'}}/>)}
                            </div>
                            {todayX > 0 && <div style={{position:'absolute',left:todayX,top:0,bottom:0,width:2,background:'#3b82f688',zIndex:10,pointerEvents:'none'}}/>}
                            {tStart&&tEnd&&bar(tStart,tEnd,idx,10,false,true,`${p.project} - ${il.label}`,'30%')}
                            {aStart&&aEnd&&bar(aStart,aEnd,idx,10,(il.subtasks||[]).every(s=>s.done)&&(il.subtasks||[]).length>0,false,`${p.project} - ${il.label}`,'70%')}
                          </div>
                        </div>

                        {/* Subtask rows */}
                        {expanded[p._key+'_'+il.id]&&(il.subtasks||[]).map((st,si) => {
                          const stTStart = st.targetStart || st.startDate
                          const stTEnd   = st.targetEnd   || st.endDate
                          const stAStart = st.actualStart || (st.done ? st.startDate : null)
                          const stAEnd   = st.actualEnd   || (st.done ? st.endDate   : null)
                          return (
                            <div key={si} style={{display:'flex', borderBottom:'1px solid var(--border)'}}>
                              {/* Pinned subtask label */}
                              <div style={{
                                width: LABEL_W,
                                flexShrink: 0,
                                position: 'sticky',
                                left: 0,
                                zIndex: 20,
                                background: IL_BGS[idx]+'55',
                                borderRight: '1px solid '+IL_COLORS[idx]+'33',
                                height: ROW_H_ST,
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 6px 0 32px',
                                fontSize: '.68rem',
                                color: st.done ? 'var(--text-light)' : 'var(--text-muted)',
                                overflow: 'hidden',
                                textDecoration: st.done ? 'line-through' : 'none',
                              }}>
                                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{st.label||st}</span>
                              </div>
                              {/* Bar area */}
                              <div style={{flex:1, position:'relative', height:ROW_H_ST, minWidth: totalW, background: IL_BGS[idx]+'11'}}>
                                <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,display:'flex',pointerEvents:'none'}}>
                                  {cols.map((_,i)=><div key={i} style={{width:cw,flexShrink:0,borderRight:'1px solid var(--border-light)'}}/>)}
                                </div>
                                {todayX > 0 && <div style={{position:'absolute',left:todayX,top:0,bottom:0,width:2,background:'#3b82f644',zIndex:10,pointerEvents:'none'}}/>}
                                {stTStart&&stTEnd&&bar(stTStart,stTEnd,idx,8,false,true,`${p.project} - ${st.label||st}`,'30%')}
                                {stAStart&&stAEnd&&bar(stAStart,stAEnd,idx,8,st.done,false,`${p.project} - ${st.label||st}`,'70%')}
                              </div>
                            </div>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </div>
              )
            })}
            <div style={{height:80}}/>
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
