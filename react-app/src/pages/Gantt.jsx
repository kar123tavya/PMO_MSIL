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
const LABEL_W   = 280

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
  const [search,          setSearch]          = useState('')
  const [filterDiv,       setFilterDiv]       = useState(user?.role === 'pic' ? (user?.division || '') : '')
  const [expanded,        setExpanded]        = useState({})
  const [viewMode,        setViewMode]        = useState('monthly')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportProjKey,   setExportProjKey]   = useState('')
  const [exporting,       setExporting]       = useState(false)
  const [isolatedProjKey, setIsolatedProjKey] = useState(null)
  const [showColMgr,      setShowColMgr]      = useState(false)
  const [customCols,      setCustomCols]      = useState([])
  // Tracks horizontal scroll to float project labels inside the gantt area
  const [ganttScrollX,      setGanttScrollX]      = useState(0)
  // Which project label is highlighted (when clicked from the gantt badge)
  const [highlightedProjKey, setHighlightedProjKey] = useState(null)

  // prevent recursive scroll sync
  const isSyncingScroll = useRef(false)

  // LEFT sidebar (project labels) — vertically scrollable only
  const labelsRef     = useRef(null)
  // RIGHT gantt body  — vertically scrollable
  const ganttBodyRef  = useRef(null)
  // OUTER wrapper for RIGHT pane — horizontally scrollable
  const ganttXRef     = useRef(null)

  useEffect(() => {
    api.get('/settings/columns').then(({ data }) => {
      if (Array.isArray(data)) setCustomCols(data.filter(c => c.views.includes('gantt') && c.status === 'approved'))
    }).catch(console.error)
  }, [showColMgr])

  // Sync vertical scrolling between left labels pane and right gantt body
  function handleLabelScroll(e) {
    if (isSyncingScroll.current) return
    isSyncingScroll.current = true
    if (ganttBodyRef.current) ganttBodyRef.current.scrollTop = e.target.scrollTop
    requestAnimationFrame(() => { isSyncingScroll.current = false })
  }
  function handleBodyScroll(e) {
    if (isSyncingScroll.current) return
    isSyncingScroll.current = true
    if (labelsRef.current) labelsRef.current.scrollTop = e.target.scrollTop
    requestAnimationFrame(() => { isSyncingScroll.current = false })
  }
  function handleXScroll(e) {
    setGanttScrollX(e.target.scrollLeft)
  }

  // Called when user clicks the floating project badge in the gantt area.
  // Scrolls the left label panel to that project row and briefly highlights it.
  function scrollToLabel(projKey) {
    const el = document.getElementById(`label-proj-${projKey}`)
    if (el && labelsRef.current) {
      // Scroll left panel so the project label is near the top
      labelsRef.current.scrollTop = el.offsetTop - 8
      // Also sync the right gantt body
      if (ganttBodyRef.current) ganttBodyRef.current.scrollTop = el.offsetTop - 8
    }
    // Highlight for 1.5 seconds
    setHighlightedProjKey(projKey)
    setTimeout(() => setHighlightedProjKey(null), 1500)
  }

  const filtered = useMemo(() =>
    projects.filter(p =>
      (!search || (p.project||'').toLowerCase().includes(search.toLowerCase())) &&
      (!filterDiv || p.division === filterDiv) &&
      (!isolatedProjKey || p._key === isolatedProjKey)
    ),
    [projects, search, filterDiv, isolatedProjKey]
  )

  // Build 4 years before and 4 years after today
  const { cols, totalW, todayX, cw } = useMemo(() => {
    const now = new Date()
    const mn = new Date(now.getFullYear() - 4, 0, 1).getTime()
    const mx = new Date(now.getFullYear() + 4, 11, 31).getTime()
    const step   = MODES[viewMode].step
    const cellW  = MODES[viewMode].cellW
    const cs     = buildCols(mn, mx, step)
    const tx     = dateToX(now, cs, cellW)
    return { cols: cs, totalW: cs.length * cellW, todayX: tx, cw: cellW }
  }, [viewMode])

  // Scroll to today whenever the view mode changes or the chart first loads
  // Use a small delay so the DOM has finished painting before we measure clientWidth
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ganttXRef.current && todayX > 0) {
        const visibleW = ganttXRef.current.clientWidth
        // Center today in the visible area
        ganttXRef.current.scrollLeft = Math.max(0, todayX - visibleW / 2)
      }
    }, 80)
    return () => clearTimeout(timer)
  }, [todayX, viewMode])

  const groups = useMemo(() => {
    const g = []
    cols.forEach(c => { const l = g[g.length-1]; if (l && l.label === c.group) l.span++; else g.push({label:c.group, span:1}) })
    return g
  }, [cols])

  const todayStr = new Date().toISOString().slice(0,10)

  function togglePhase(pKey, ilId) { setExpanded(e => ({...e, [pKey+'_'+ilId]: !e[pKey+'_'+ilId]})) }

  function bar(startStr, endStr, ilIdx, h, done, isTarget=false, projName='', topOffset='50%') {
    const x1 = dateToX(startStr, cols, cw)
    const x2 = dateToX(endStr,   cols, cw)
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

  // Height calculations
  const TOOLBAR_H   = 49  // toolbar bar height
  const HEADER_H    = 60  // top header height
  const COL_HEAD_H  = 52  // year + month header rows
  const BODY_H      = `calc(100vh - ${HEADER_H}px - ${TOOLBAR_H}px - ${COL_HEAD_H}px)`

  return (
    <div className="app-shell">
      <Sidebar/>
      <div className="app-main" style={{overflow:'hidden'}}>
        <Header title="Gantt Chart" />

        {/* Toolbar */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',background:'var(--surface)',borderBottom:'1px solid var(--border)',flexWrap:'wrap',height:TOOLBAR_H,boxSizing:'border-box'}}>
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
            placeholder="🔍 Search…"
            value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{padding:'5px 10px',borderRadius:6,border:'1px solid var(--border)',fontSize:'0.8rem',width:170}}
          />
          <button
            className="btn btn-outline"
            style={{padding:'3px 10px',fontSize:'0.78rem'}}
            onClick={() => {
              if (ganttXRef.current && todayX > 0) {
                const visibleW = ganttXRef.current.clientWidth
                ganttXRef.current.scrollLeft = Math.max(0, todayX - visibleW / 2)
              }
            }}
          >📅 Jump to Today</button>
          <button className="btn btn-primary" style={{padding:'4px 12px',height:32,fontSize:'0.8rem'}} onClick={()=>setShowExportModal(true)}>📷 Export</button>
          <button className="btn btn-outline" style={{padding:'4px 12px',height:32,fontSize:'0.8rem'}} onClick={()=>setShowColMgr(true)}>⚙ Columns</button>
          <span style={{marginLeft:'auto',fontSize:'0.75rem',color:'var(--text-muted)'}}>{filtered.length} project{filtered.length!==1?'s':''}</span>
        </div>

        {/*
          TWO-PANEL LAYOUT:
          ┌──────────────┬────────────────────────────────────────────┐
          │  LEFT PANEL  │         RIGHT PANEL (scrolls X+Y)         │
          │  (labels)    ├────────────────────────────────────────────┤
          │  scrolls Y   │  Year header  (sticky top)                │
          │  only        ├────────────────────────────────────────────┤
          │              │  Month header (sticky top)                 │
          │  Labels stay ├────────────────────────────────────────────┤
          │  PINNED      │  Gantt bars   (scrolls Y)                  │
          └──────────────┴────────────────────────────────────────────┘
        */}
        <div id="gantt-full-view" style={{display:'flex', height:`calc(100vh - ${HEADER_H}px - ${TOOLBAR_H}px)`, overflow:'hidden'}}>

          {/* ───── LEFT LABEL PANEL (pinned, no horizontal scroll) ───── */}
          <div style={{
            width: LABEL_W,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '2px solid var(--border)',
            background: 'var(--surface)',
            zIndex: 10,
          }}>
            {/* Header placeholder (same height as the year+month row in the right panel) */}
            <div style={{
              height: COL_HEAD_H,
              flexShrink: 0,
              background: '#1e3a8a',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '0 12px',
              borderBottom: '2px solid #1e3a8a',
            }}>
              <div style={{fontSize:'.65rem',fontWeight:700,color:'rgba(255,255,255,0.6)',marginBottom:4}}>TIMELINE</div>
              <div style={{fontSize:'.72rem',fontWeight:800,color:'#fff'}}>PROJECT / PHASE</div>
            </div>

            {/* Scrollable label list — vertically synced with gantt body */}
            <div
              ref={labelsRef}
              onScroll={handleLabelScroll}
              style={{flex:1, overflowY:'auto', overflowX:'hidden'}}
            >
              {filtered.map(p => (
                <div key={p._key}>
                  {/* Project row — id is used for scrollToLabel() */}
                  <div
                    id={`label-proj-${p._key}`}
                    style={{
                      padding:'0 10px',
                      fontWeight:700,
                      fontSize:'.78rem',
                      color: highlightedProjKey === p._key ? '#fff' : 'var(--primary)',
                      background: highlightedProjKey === p._key ? '#1e3a8a' : 'var(--surface-2)',
                      borderBottom:'1px solid var(--border)',
                      height:ROW_H_PRJ,
                      display:'flex',
                      alignItems:'center',
                      overflow:'hidden',
                      transition:'background 0.3s, color 0.3s',
                      borderLeft: highlightedProjKey === p._key ? '4px solid #60a5fa' : '4px solid transparent',
                    }}
                  >
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={p.project}>{p.project}</span>
                  </div>
                  {/* IL phase rows */}
                  {(p.il_phases||[]).map((il,idx) => (
                    <React.Fragment key={il.id}>
                      <div
                        onClick={() => togglePhase(p._key, il.id)}
                        style={{
                          height:ROW_H_PH,
                          display:'flex',alignItems:'center',
                          padding:'0 8px 0 18px',gap:6,
                          background:IL_BGS[idx]+'88',
                          borderBottom:'1px solid var(--border)',
                          cursor:'pointer',fontSize:'.72rem',fontWeight:600,color:IL_COLORS[idx],overflow:'hidden'
                        }}
                      >
                        <span style={{fontSize:'.6rem',flexShrink:0}}>{expanded[p._key+'_'+il.id]?'▼':'▶'}</span>
                        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{il.label}</span>
                      </div>
                      {expanded[p._key+'_'+il.id] && (il.subtasks||[]).map((st,si) => (
                        <div key={si} style={{
                          height:ROW_H_ST,
                          display:'flex',alignItems:'center',
                          padding:'0 6px 0 32px',
                          background:IL_BGS[idx]+'33',
                          borderBottom:'1px solid var(--border)',
                          fontSize:'.68rem',
                          color:st.done?'var(--text-light)':'var(--text-muted)',
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                          textDecoration:st.done?'line-through':'none',
                        }}>
                          {st.label||st}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && <div className="no-data">No projects found.</div>}
              <div style={{height:80}}/>
            </div>
          </div>

          {/* ───── RIGHT GANTT PANEL (scrolls horizontally) ───── */}
          <div ref={ganttXRef} onScroll={handleXScroll} style={{flex:1, overflowX:'auto', display:'flex', flexDirection:'column'}}>
            {/* This inner div is as wide as all the timeline columns */}
            <div style={{minWidth:totalW, display:'flex', flexDirection:'column', flex:1}}>

              {/* Sticky column headers (year + month) */}
              <div style={{position:'sticky',top:0,zIndex:15,background:'var(--surface-2)',borderBottom:'2px solid var(--border)',flexShrink:0}}>
                {/* Year group row */}
                <div style={{display:'flex',height:28}}>
                  {groups.map((g,i) => (
                    <div key={i} style={{
                      width:g.span*cw,flexShrink:0,
                      borderRight:'1px solid var(--border)',
                      padding:'5px 6px',
                      fontSize:'.62rem',fontWeight:700,color:'var(--text-muted)',
                      whiteSpace:'nowrap',overflow:'hidden',
                      background: i%2===0 ? 'var(--surface-2)' : 'var(--surface)',
                    }}>{g.label}</div>
                  ))}
                </div>
                {/* Month/week/quarter label row */}
                <div style={{display:'flex',height:24}}>
                  {cols.map((c,i) => (
                    <div key={i} style={{
                      width:cw,height:'100%',
                      textAlign:'center',fontSize:'.58rem',color:'var(--text-light)',fontWeight:400,
                      flexShrink:0,borderRight:'1px solid var(--border)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                    }}>{c.label}</div>
                  ))}
                </div>
              </div>

              {/* Scrollable gantt body — vertically synced with left labels */}
              <div
                ref={ganttBodyRef}
                onScroll={handleBodyScroll}
                style={{flex:1, overflowY:'auto', position:'relative'}}
              >
                {/* Grid background vertical lines */}
                <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,display:'flex',pointerEvents:'none',zIndex:0}}>
                  {cols.map((_,i) => <div key={i} style={{width:cw,borderRight:'1px solid var(--border-light)',flexShrink:0}}/>)}
                </div>

                {/* TODAY vertical line */}
                {todayX > 0 && (
                  <div style={{position:'absolute',left:todayX,top:0,bottom:0,width:2,background:'#3b82f6',zIndex:20,pointerEvents:'none'}}>
                    <div style={{position:'sticky',top:4,left:4,background:'#3b82f6',color:'#fff',padding:'2px 6px',fontSize:'0.6rem',fontWeight:800,borderRadius:10,whiteSpace:'nowrap',display:'inline-block'}}>TODAY</div>
                  </div>
                )}

                {/* Project rows */}
                <div style={{position:'relative',zIndex:1}}>
                  {filtered.map(p => {
                    let targetStart = null
                    ;(p.il_phases||[]).forEach(il => {
                      if (il.startDate && (!targetStart || il.startDate < targetStart)) targetStart = il.startDate
                    })
                    return (
                      <div key={p._key}>
                        {/* Project-level bar row — floating project name follows the scroll */}
                        <div style={{position:'relative',height:ROW_H_PRJ,borderBottom:'1px solid var(--border)',background:'var(--surface-2)'}}>
                          {/* Floating project name label — always visible at the left edge of the viewport */}
                          <div
                            title="Click to jump to this project in the label panel"
                            onClick={() => scrollToLabel(p._key)}
                            style={{
                              position: 'absolute',
                              left: ganttScrollX + 8,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: highlightedProjKey === p._key ? '#2563eb' : 'rgba(30,58,138,0.88)',
                              color: '#fff',
                              padding: '2px 10px',
                              borderRadius: 10,
                              fontSize: '.68rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              maxWidth: 240,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              zIndex: 5,
                              cursor: 'pointer',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
                              userSelect: 'none',
                              transition: 'background 0.2s',
                              border: '1px solid rgba(255,255,255,0.25)',
                            }}
                          >🔍 {p.project}</div>
                          {targetStart && p.liveTarget && bar(targetStart, p.liveTarget, 0, 16, false, true, p.project, '50%')}
                        </div>
                        {/* IL phase rows */}
                        {(p.il_phases||[]).map((il,idx) => {
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
                              {expanded[p._key+'_'+il.id]&&(il.subtasks||[]).map((st,si) => {
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
                <div style={{height:80}}/>
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
