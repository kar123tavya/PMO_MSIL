import React, { useState, useMemo, useEffect } from 'react'
import Sidebar    from '../components/Sidebar'
import api        from '../api/client'
import Header     from '../components/Header'
import StatusPill from '../components/StatusPill'
import ProjectForm from '../components/ProjectForm'
import ApprovalModal from '../components/ApprovalModal'
import ColumnManager from '../components/ColumnManager'
import { useProjects } from '../context/ProjectContext'
import { useAuth }     from '../context/AuthContext'
import { useToast }    from '../context/ToastContext'
import html2canvas     from 'html2canvas'
import { calculateProjectProgress } from '../utils/progressCalc'

const IL_IDS = ['il1','il2','il3','il4','il5']
const IL_LBL = [
  'Ideation',
  'Approval',
  'Design & Development',
  'UAT (+ Cybersecurity)',
  'Live'
]

function fmtDate(str) {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d) ? null : d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'})
}

export default function Flagship() {
  const { projects, loading, saveProject, deleteProject } = useProjects()
  const { can, user } = useAuth()
  const { showToast }= useToast()

  const [search, setSearch] = useState('')
  const [filterTheme, setFilterTheme] = useState('')
  const [filterDiv, setFilterDiv] = useState(user?.role === 'pic' ? (user?.division || '') : '')
  
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [approvalOpen,  setApprovalOpen]  = useState(false)
  const [approvalData,  setApprovalData]  = useState({ project: null, changes: [], isCompletion: false })
  
  const [showColMgr, setShowColMgr] = useState(false)
  const [customCols, setCustomCols] = useState([])
  const [globalPhases, setGlobalPhases] = useState([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    api.get('/settings/il_phases').then(({ data }) => {
      if (data.value && Array.isArray(data.value)) setGlobalPhases(data.value)
    }).catch(console.error)

    api.get('/settings/columns').then(({ data }) => {
      if (Array.isArray(data)) setCustomCols(data.filter(c => c.views.includes('flagship') && c.status === 'approved'))
    }).catch(console.error)
  }, [showColMgr])

  const flagships = useMemo(() => {
    let arr = projects.filter(p=>p.flagship)
      .filter(p=>!search||(p.project||'').toLowerCase().includes(search.toLowerCase()))
      .filter(p=>!filterTheme||p.theme === filterTheme)
      .filter(p=>!filterDiv||p.division === filterDiv);
    
    // Sort by theme so they group together
    arr.sort((a,b) => (a.theme||'—').localeCompare(b.theme||'—'));
    return arr;
  }, [projects, search, filterTheme, filterDiv])

  const themeSpans = useMemo(() => {
    const spans = [];
    for (let i = 0; i < flagships.length; i++) {
      if (i === 0 || (flagships[i].theme||'—') !== (flagships[i-1].theme||'—')) {
        let count = 1;
        for (let j = i + 1; j < flagships.length; j++) {
          if ((flagships[j].theme||'—') === (flagships[i].theme||'—')) count++;
          else break;
        }
        spans.push(count);
      } else {
        spans.push(0); // 0 means do not render this cell
      }
    }
    return spans;
  }, [flagships]);

  const allThemes = useMemo(()=> [...new Set(projects.filter(p=>p.flagship&&p.theme).map(p=>p.theme))].sort(), [projects])
  const allDivs   = useMemo(()=> [...new Set(projects.filter(p=>p.flagship&&p.division).map(p=>p.division))].sort(), [projects])

  // helper to check if an IL phase is done
  const isPhaseDone = (phases, ilId) => {
    const ph = (phases||[]).find(x => x.id === ilId)
    if (!ph || !ph.subtasks || ph.subtasks.length === 0) return false
    return ph.subtasks.every(s => s.done)
  }

  async function handleSave(data) {
    setSaving(true)
    try {
      const isEdit = data._key && data._key !== '__new__'
      const orig   = isEdit ? projects.find(p => p._key === data._key) : null
      const TRACKED_FIELDS = ['status','liveTarget','division','category','fy','manhours','directCost','flagship','mis','critical']
      const changes = orig
        ? TRACKED_FIELDS.filter(f => String(orig[f]??'') !== String(data[f]??'')).map(f => ({ field: f, from: String(orig[f]??''), to: String(data[f]??'') }))
        : []

      if (user?.role === 'pic' && data.division && user?.division && data.division !== user.division) {
        const reason = window.prompt(`You are editing a project in ${data.division} Division, but you belong to ${user.division} Division.\n\nPlease provide a short reason for this cross-division change:`);
        if (!reason) {
          showToast('Cross-division edit cancelled. A reason is required.', 'error');
          setSaving(false);
          return;
        }
        data._crossDivisionReason = reason;
      }


      const res = await saveProject(data)
      if (res && res.status === 202) {
        showToast('Edits submitted for Head approval!', 'info')
      } else {
        showToast(isEdit ? 'Project updated!' : 'Project added!', 'success')
      }
      setModal(false)

      let newlyCompleted = []
      if (isEdit && orig) {
        IL_IDS.forEach(il => {
          if (!isPhaseDone(orig.il_phases, il) && isPhaseDone(data.il_phases, il)) {
            newlyCompleted.push(il.toUpperCase())
          }
        })
      }

      if (newlyCompleted.length > 0) {
        setApprovalData({ project: data, changes: [], isCompletion: true, completedPhases: newlyCompleted })
        setApprovalOpen(true)
      }
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(key){
    if(!window.confirm('Delete this project?')) return
    try{ await deleteProject(key); showToast('Project deleted','success'); setModal(false) }
    catch(e){ showToast(e.message||'Delete failed','error') }
  }

  const handleExport = () => {
    setExporting(true)
    setTimeout(() => {
      const el = document.getElementById('flagship-export-area')
      if(!el){ setExporting(false); return }
      html2canvas(el, { scale: 2 }).then(canvas => {
        const link = document.createElement('a')
        link.download = `Flagship_Snapshot.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        setExporting(false)
      })
    }, 100)
  }

  if (loading) return <div className="loading-screen">Loading…</div>

  return (
    <div className="app-shell">
      <Sidebar/>
      <div className="app-main">
        <Header title="Flagship Projects" searchValue={search} onSearch={setSearch}>
          <button className="btn btn-outline" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : '📷 Export Snapshot'}
          </button>
          <button className="btn btn-ghost" onClick={()=>setShowColMgr(true)}>⚙ Columns</button>
        </Header>
        <div className="page-content" id="flagship-export-area" style={{ background: 'var(--bg-color)' }}>
          <div className="filter-bar" style={{display:'flex', gap:15, padding:'12px 16px', background:'var(--surface-2)', borderBottom:'1px solid var(--border)', alignItems:'center'}}>
            <div className="form-group" style={{marginBottom:0}}>
              <select value={filterTheme} onChange={e=>setFilterTheme(e.target.value)} style={{padding:'6px 10px', borderRadius:6, border:'1px solid var(--border)'}}>
                <option value="">All Themes</option>
                {allThemes.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <select value={filterDiv} onChange={e=>setFilterDiv(e.target.value)} style={{padding:'6px 10px', borderRadius:6, border:'1px solid var(--border)'}}>
                <option value="">All Divisions</option>
                {allDivs.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {(filterTheme || filterDiv) && (
              <button className="btn btn-ghost" onClick={()=>{setFilterTheme(''); setFilterDiv('')}} style={{padding:'4px 8px', fontSize:'0.75rem'}}>✕ Clear Filters</button>
            )}
            <div style={{marginLeft:'auto', fontSize:'0.8rem', color:'var(--text-muted)'}}>
              <span className="count-badge">{flagships.length}</span> of {projects.length} flagship projects
            </div>
          </div>

          <div className="legend-bar" style={{display:'flex', gap:15, padding:'10px 16px', background:'var(--surface-2)', borderBottom:'1px solid var(--border)', fontSize:'0.75rem', fontWeight:600}}>
            <span className="legend-item" style={{display:'flex', alignItems:'center', gap:6}}><span className="circle-green" style={{width:12,height:12,display:'inline-block',borderRadius:'50%'}}></span> Completed</span>
            <span className="legend-item" style={{display:'flex', alignItems:'center', gap:6}}><span className="circle-yellow" style={{width:12,height:12,display:'inline-block',borderRadius:'50%'}}></span> In Progress</span>
            <span className="legend-item" style={{display:'flex', alignItems:'center', gap:6}}><span className="circle-red" style={{width:12,height:12,display:'inline-block',borderRadius:'50%'}}></span> Delayed / On Hold</span>
            <span className="legend-item" style={{display:'flex', alignItems:'center', gap:6}}><span className="circle-blue" style={{width:12,height:12,display:'inline-block',borderRadius:'50%'}}></span> To be started</span>
          </div>

          <div className="table-wrap">
            <table style={{tableLayout:'fixed', minWidth:1200, width:'100%'}}>
              <thead>
                <tr>
                  <th style={{width:150, background:'#1e3a8a', color:'#fff', borderRight:'1px solid rgba(255,255,255,0.2)'}}>Theme</th>
                  <th style={{width:200, background:'#1e3a8a', color:'#fff', borderRight:'1px solid rgba(255,255,255,0.2)'}}>Project</th>
                  <th style={{width:130, background:'#1e3a8a', color:'#fff', borderRight:'1px solid rgba(255,255,255,0.2)'}}>Division</th>
                  <th style={{background:'#1e3a8a', color:'#fff', width:110, borderRight:'1px solid rgba(255,255,255,0.2)', textAlign:'center'}}>3rd Party Req</th>
                  {customCols.map(c=><th key={c.id} style={{background:'#1e3a8a', color:'#fff', borderRight:'1px solid rgba(255,255,255,0.2)'}}>{c.label}</th>)}
                  {IL_LBL.map(l=><th key={l} style={{width:130,textAlign:'center', background:'#1e3a8a', color:'#fff', borderRight:'1px solid rgba(255,255,255,0.2)'}}>{l==='UAT (+ Cybersecurity)' ? 'UAT (+Cybersecurity)' : l}</th>)}
                  <th style={{width:150, background:'#1e3a8a', color:'#fff'}}>Status<br/><small>(As on date)</small></th>
                </tr>
              </thead>
              <tbody>
                {flagships.length===0&&(
                  <tr><td colSpan={4 + customCols.length + IL_LBL.length} className="no-data">No flagship projects found.</td></tr>
                )}
                {flagships.map((p, idx) => (
                  <tr key={p._key} className={idx % 2 === 0 ? "row-even" : "row-odd"} style={{background: '#fff', borderBottom: '1px solid var(--border)'}}>
                    {themeSpans[idx] > 0 && (
                      <td rowSpan={themeSpans[idx]} style={{background:'#fff', borderRight:'1px solid var(--border)', verticalAlign:'middle', padding:'12px 10px'}}>
                        <div style={{background:'#e2e8f0', color:'#334155', padding:'4px 8px', borderRadius:'12px', fontSize:'0.7rem', fontWeight:600, display:'inline-block'}}>
                          {p.theme || '—'}
                        </div>
                      </td>
                    )}
                    <td style={{background:'#fff', borderRight:'1px solid var(--border)', padding:'12px 10px'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div className="proj-name" onClick={() => { setEditing(p); setModal(true); }} title="Click to edit" style={{cursor:'pointer', color:'var(--primary)', fontWeight:700, fontSize:'0.85rem'}}>{p.project}</div>
                        <button onClick={() => { setEditing(p); setModal(true); }} className="btn btn-outline" style={{padding:'2px 8px', fontSize:'0.65rem', display:'flex', alignItems:'center', gap:'4px'}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          Edit
                        </button>
                      </div>
                    </td>
                    <td style={{background:'#fff', borderRight:'1px solid var(--border)', padding:'12px 10px'}}>
                      <div style={{fontSize:'0.75rem', color:'var(--text-main)'}}>{p.division || '—'}</div>
                    </td>
                    <td style={{textAlign:'center', borderRight:'1px solid var(--border)', verticalAlign:'middle'}}>
                      {p.thirdParty ? <span style={{color:'var(--green)', fontWeight:'bold', fontSize:'1.1rem'}}>✓</span> : <span style={{color:'var(--red)', fontWeight:'bold', fontSize:'1.1rem'}}>✕</span>}
                    </td>
                    {customCols.map(c=><td key={c.id} style={{borderRight:'1px solid var(--border)', verticalAlign:'middle'}}>{(p.customData||{})[c.id]||'—'}</td>)}
                    
                    {IL_IDS.map((id, phIdx) => {
                      const il = (p.il_phases||[]).find(x=>x.id===id)
                      let stClass = 'circle-grey'
                      let total = 0, done = 0
                      if (il && il.subtasks) {
                        total = il.subtasks.length
                        done = il.subtasks.filter(s=>s.done).length
                      }
                      
                      // Fallback logic if they haven't explicitly set a custom color
                      if (il?.endDate || (total > 0 && done === total)) stClass = 'circle-green'
                      else if (il?.startDate) stClass = 'circle-blue'

                      if (stClass !== 'circle-green' && il?.startDate && new Date(il.startDate) < new Date()) {
                        stClass = 'circle-red'
                      }

                      // Override with manual dropdown color
                      if (il?.phaseColor === 'blue') stClass = 'circle-blue'
                      else if (il?.phaseColor === 'yellow') stClass = 'circle-yellow'
                      else if (il?.phaseColor === 'green') stClass = 'circle-green'
                      else if (il?.phaseColor === 'red') stClass = 'circle-red'

                      let customStyle = {margin:'0 auto', width:14, height:14, borderRadius:'50%'}

                      return (
                        <td key={id} style={{position:'relative', padding:'16px 4px 8px 4px', textAlign:'center', verticalAlign:'top', borderRight: '1px solid var(--border)'}}>
                          {il?.showArrow && (
                            <div className="phase-arrow"></div>
                          )}
                          <div style={{display:'flex', flexDirection:'column', alignItems:'center', position:'relative', zIndex:5}}>
                            <div className={stClass} style={customStyle} title={p.overallStatus ? `Reason: ${p.overallStatus}` : 'No reason provided'}></div>
                            {(il?.targetEnd || il?.startDate) && <span style={{fontSize:'0.65rem', color:'var(--primary)', marginTop:6, fontWeight:600}}>T: {fmtDate(il.targetEnd || il.startDate)}</span>}
                            {(il?.actualEnd || il?.endDate) && <span style={{fontSize:'0.65rem', color:'var(--green)', marginTop:2}}>A: {fmtDate(il.actualEnd || il.endDate)}</span>}
                          </div>
                        </td>
                      )
                    })}
                    <td style={{verticalAlign:'middle', fontSize:'0.75rem'}}>
                      <div className="remark-cell" title={p.overallStatus}>{p.overallStatus||'—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {modal && <ProjectForm project={editing} ilPhases={globalPhases} onSave={handleSave} onDelete={handleDelete} onClose={() => setModal(false)} saving={saving}/>}
      {showColMgr && <ColumnManager onClose={() => setShowColMgr(false)} />}
      {approvalOpen && <ApprovalModal 
        project={approvalData.project} 
        changes={approvalData.changes}
        isCompletion={approvalData.isCompletion}
        completedPhases={approvalData.completedPhases}
        onClose={() => setApprovalOpen(false)} 
        onSent={() => setApprovalOpen(false)} 
      />}
    </div>
  )
}
