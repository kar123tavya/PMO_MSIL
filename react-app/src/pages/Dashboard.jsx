import React, { useState, useMemo, useEffect } from 'react'
import Sidebar        from '../components/Sidebar'
import Header         from '../components/Header'
import StatusPill     from '../components/StatusPill'
import KPICard        from '../components/KPICard'
import ProjectForm    from '../components/ProjectForm'
import ImportModal    from '../components/ImportModal'
import RoleBadge      from '../components/RoleBadge'
import ApprovalModal  from '../components/ApprovalModal'
import ColumnManager  from '../components/ColumnManager'
import { useProjects }       from '../context/ProjectContext'
import { useAuth }           from '../context/AuthContext'
import { useToast }          from '../context/ToastContext'

const STATUS_OPTS = ['IL1','IL2','IL3','IL4','IL5','Live','On Hold','Cancelled']
const IL_PHASES = [
  { id:'il1', label:'IL1 – Ideation',            subtasks:['Business problem identification','BRD Preparation & refinement','Value Creation Framework (Cost benefit and ROI analysis)','Project feasibility assessment (Technology Selection)'] },
  { id:'il2', label:'IL2 – Approval',            subtasks:['Demand Approval and allocation to CoE','Project requirement discussion with D&I along with Business user','Technical feasibility assessment by DE','Project Scope finalization with BRD sign-off','Vendor Details Shared by DE for RFQ','IPR / RFQ Ring Approval','RFQ Float to vendor and Scope discussion','Technical Evaluation of Vendor Proposals','TEPO Ring (In case of Capital)','Commercial Negotiation by DE','Payment Ring Approval','Vendor Onboarding','Detailed requirement understanding through focused workshops','Wireframe & Figma preparation'] },
  { id:'il3', label:'IL3 – Design & Development', subtasks:['Project detailed scope along with benefits','Design Approval','RFQ & Ring Approval process as in IL2 (Major Projects)','Vendor Onboarding','Solution Development','Management Reviews as per Governance Mechanism'] },
  { id:'il4', label:'IL4 – UAT',                 subtasks:['User Acceptance Testing (UAT)','UAT feedbacks incorporation','UAT sign-off by User','User Manual & Training Sessions for all Users'] },
  { id:'il5', label:'IL5 – Live',                subtasks:['Live Deployment & Hypercare Support'] },
]

function fmtDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return isNaN(d) ? str : d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'})
}
function genCode(key) {
  if (!key) return '#????'
  const h = key.split('').reduce((a,c)=>((a<<5)-a)+c.charCodeAt(0),0)
  return '#'+Math.abs(h).toString(16).toUpperCase().padStart(4,'0').slice(0,4)
}
function currentStage(p) {
  if (!p.il_phases?.length) return null
  for (let i = p.il_phases.length - 1; i >= 0; i--) {
    const il = p.il_phases[i]
    if (il.done || il.status === 'Completed' || il.status === 'In Progress') {
       return `${il.id.toUpperCase()} - ${il.label.split('–')[1]?.trim() || il.label}`
    }
  }
  // If nothing in progress or done, just show the first phase
  const first = p.il_phases[0]
  if (first) return `${first.id.toUpperCase()} - ${first.label.split('–')[1]?.trim() || first.label}`
  return null
}

export default function Dashboard() {
  const { projects, loading, saveProject, deleteProject } = useProjects()
  const { can, user }      = useAuth()
  const { showToast }= useToast()

  const [search,  setSearch]  = useState('')
  const [divF,    setDivF]    = useState(user?.role === 'pic' ? (user?.division || '') : '')
  const [catF,    setCatF]    = useState('')
  const [fyF,     setFyF]     = useState('')
  const [stF,     setStF]     = useState('')
  const [flagF,   setFlagF]   = useState(false)
  const [critF,   setCritF]   = useState(false)
  const [misF,    setMisF]    = useState(false)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [importOpen,    setImportOpen]    = useState(false)
  const [approvalOpen,  setApprovalOpen]  = useState(false)
  const [approvalData,  setApprovalData]  = useState({ project: null, changes: [] })
  
  const [showColMgr, setShowColMgr] = useState(false)
  const [customCols, setCustomCols] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetch('/api/users').then(r=>r.json()).then(data=>{
      if (Array.isArray(data)) setUsers(data)
    }).catch(console.error)
    
    fetch('/api/settings/columns').then(r=>r.json()).then(data=>{
      if (Array.isArray(data)) setCustomCols(data.filter(c => c.views.includes('dashboard') && c.status === 'approved'))
    }).catch(console.error)
  }, [showColMgr])

  const getUserDetails = (staffId) => {
    const u = users.find(x => x.staff_no === staffId)
    return u ? `${u.name} (${u.staff_no})` : staffId || '—'
  }

  function handleExport() {
    const session = sessionStorage.getItem('pmo_session')
    const token = session ? JSON.parse(session).token : ''
    fetch('/api/projects/export', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Export request failed: ' + r.status)
        return r.blob()
      })
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href    = url
        a.download = `PMO_Master_${new Date().toISOString().slice(0,10)}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch(err => showToast('Export failed: ' + err.message, 'error'))
  }

  const divs = useMemo(()=>[...new Set(projects.map(p=>p.division).filter(Boolean))].sort(),[projects])
  const cats = useMemo(()=>[...new Set(projects.map(p=>p.category).filter(Boolean))].sort(),[projects])
  const fys  = useMemo(()=>[...new Set(projects.map(p=>p.fy).filter(Boolean))].sort(),[projects])

  const filtered = useMemo(()=>projects.filter(p=>{
    if(divF  && p.division!==divF)  return false
    if(catF  && p.category!==catF)  return false
    if(fyF   && p.fy!==fyF)         return false
    if(stF   && p.status!==stF)     return false
    if(flagF && !p.flagship)         return false
    if(critF && !p.critical)         return false
    if(misF  && !p.mis)              return false
    if(search){const q=search.toLowerCase();return (p.project||'').toLowerCase().includes(q)||(p.theme||'').toLowerCase().includes(q)||(p.parentCode||'').toLowerCase().includes(q)}
    return true
  }),[projects,divF,catF,fyF,stF,flagF,critF,misF,search])

  const kpis = useMemo(()=>{
    let mh=0,def=0,uc=0,cost=0
    filtered.forEach(p=>{
      if(p.manhours)        mh   +=Number(p.manhours)
      if(p.proactiveDefect) def  +=Number(p.proactiveDefect)
      if(p.useCases)        uc   +=Number(p.useCases)
      if(p.directCost)      cost +=Number(p.directCost)
    })
    return { total:filtered.length, manDays:Math.round((mh*12)/9).toLocaleString(), defects:Math.round(def).toLocaleString(), useCases:Math.round(uc).toLocaleString(), cost:'₹'+cost.toLocaleString('en-IN',{maximumFractionDigits:0}) }
  },[filtered])

  function clearFilters(){ setDivF('');setCatF('');setFyF('');setStF('');setFlagF(false);setCritF(false);setMisF(false);setSearch('') }

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
        
      if (orig && JSON.stringify(orig.il_phases) !== JSON.stringify(data.il_phases)) {
        changes.push({ field: 'Phase & Subtask Details', from: '(Old Timeline)', to: '(Updated Timeline)' })
      }

      const res = await saveProject(data)
      if (res && res.status === 202) {
        showToast('Edits submitted for Head approval!', 'info')
      } else {
        showToast(isEdit ? 'Project updated!' : 'Project added!', 'success')
      }
      setModal(false)

      // Edits are handled automatically by backend now, so we don't pop ApprovalModal
      // unless we want to for something else.
    } catch(e) {
      showToast(e.response?.data?.error || e.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }
  async function handleDelete(key){
    if(!window.confirm('Delete this project?')) return
    try{ await deleteProject(key); showToast('Project deleted.','success'); setModal(false) }
    catch(e){ showToast(e.message,'error') }
  }

  if(loading) return <div className="loading-screen">Loading projects…</div>

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header title="Project Dashboard" searchValue={search} onSearch={setSearch}>
          <RoleBadge />
          <div className="db-status"><span className="db-dot connected"/><span>Live</span></div>
          {can('import') && <button className="btn btn-ghost" onClick={() => setImportOpen(true)}>⬆ Import</button>}
          <button className="btn btn-ghost" onClick={()=>setShowColMgr(true)}>⚙ Columns</button>
          {can('export') && <button className="btn btn-ghost" onClick={handleExport}>⬇ Export</button>}
          {can('add_project') && <button className="btn btn-primary" onClick={() => { setEditing(null); setModal(true) }}>+ Add Project</button>}
        </Header>
        <div className="page-content">
          <div className="kpi-row">
            <KPICard label="Total Projects"    value={kpis.total}    accent="#1a56db" icon="📋"/>
            <KPICard label="Man Days / Year"   value={kpis.manDays}  accent="#7c3aed" icon="⏱"/>
            <KPICard label="Proactive Defects" value={kpis.defects}  accent="#059669" icon="🛡"/>
            <KPICard label="Use Cases"         value={kpis.useCases} accent="#d97706" icon="💡"/>
            <KPICard label="Cost Saved"        value={kpis.cost}     accent="#0891b2" icon="₹"/>
          </div>

          <div className="filters-bar">
            <select className="filter-select" value={divF} onChange={e=>setDivF(e.target.value)}>
              <option value="">All Divisions</option>{divs.map(d=><option key={d}>{d}</option>)}
            </select>
            <select className="filter-select" value={catF} onChange={e=>setCatF(e.target.value)}>
              <option value="">All Categories</option>{cats.map(c=><option key={c}>{c}</option>)}
            </select>
            <select className="filter-select" value={fyF} onChange={e=>setFyF(e.target.value)}>
              <option value="">All FY</option>{fys.map(f=><option key={f}>{f}</option>)}
            </select>
            <select className="filter-select" value={stF} onChange={e=>setStF(e.target.value)}>
              <option value="">All Status</option>{STATUS_OPTS.map(s=><option key={s}>{s}</option>)}
            </select>
            <label className={`filter-toggle${flagF?' active':''}`}><input type="checkbox" checked={flagF} onChange={e=>setFlagF(e.target.checked)}/>Flagship</label>
            <label className={`filter-toggle${critF?' active':''}`}><input type="checkbox" checked={critF} onChange={e=>setCritF(e.target.checked)}/>Critical</label>
            <label className={`filter-toggle${misF ?' active':''}`}><input type="checkbox" checked={misF}  onChange={e=>setMisF(e.target.checked)} />MIS</label>
            <button className="btn btn-ghost" style={{marginLeft:'auto'}} onClick={clearFilters}>Clear</button>
          </div>

          <div className="count-bar" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <span className="count-badge">{filtered.length}</span>
              <span>of {projects.length} projects</span>
            </div>
          </div>

          <div style={{display:'flex', justifyContent:'center', padding:'12px', background:'var(--surface-2)', borderTop:'1px solid var(--border)', borderLeft:'1px solid var(--border)', borderRight:'1px solid var(--border)', borderTopLeftRadius:'8px', borderTopRightRadius:'8px'}}>
            <div style={{fontSize:'0.85rem', color:'var(--text-main)', display:'flex', gap:16, fontWeight:600}}>
              <span style={{color:'var(--primary)'}}>IL Phases:</span>
              <span style={{color: '#5b21b6', background: '#ede9fe', padding: '2px 6px', borderRadius: 4}}>IL1 - Ideation</span>
              <span style={{color: '#0369a1', background: '#e0f2fe', padding: '2px 6px', borderRadius: 4}}>IL2 - Approval</span>
              <span style={{color: '#15803d', background: '#dcfce7', padding: '2px 6px', borderRadius: 4}}>IL3 - Design & Development</span>
              <span style={{color: '#854d0e', background: '#fef9c3', padding: '2px 6px', borderRadius: 4}}>IL4 - UAT</span>
              <span style={{color: '#991b1b', background: '#fee2e2', padding: '2px 6px', borderRadius: 4}}>IL5 - Live</span>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Code</th><th>Project Name</th><th>Status</th><th>Live Target</th>
                <th>Category</th><th>Division</th><th>FY</th><th>Man-hrs/Mo</th>
                <th>Cost (₹)</th><th>Defects</th><th>Use Cases</th>
                <th>Flag</th><th>Critical</th><th>MIS</th><th>Assigned To</th>
                {customCols.map(c=><th key={c.id}>{c.label}</th>)}
                <th>Current Stage</th>
              </tr></thead>
              <tbody>
                {filtered.length===0&&<tr><td colSpan={16+customCols.length} className="no-data">No projects match the current filters.</td></tr>}
                {filtered.map((p,i)=>{
                  const stage=currentStage(p)
                  return(
                    <tr key={p._key} style={{background:i%2===1?'var(--surface-2)':''}}>
                      <td style={{fontFamily:'monospace',fontSize:'.75rem',color:'var(--text-muted)'}}>{p.parentCode||genCode(p._key)}</td>
                      <td className="td-projname" onClick={()=>{setEditing(p);setModal(true)}}>{p.project||'—'}</td>
                      <td><StatusPill status={p.status}/></td>
                      <td style={{fontSize:'.75rem',whiteSpace:'nowrap'}}>{fmtDate(p.liveTarget)}</td>
                      <td style={{fontSize:'.75rem'}}>{p.category||'—'}</td>
                      <td style={{fontSize:'.75rem'}}>{p.division||'—'}</td>
                      <td style={{fontSize:'.75rem'}}>{p.fy||'—'}</td>
                      <td style={{textAlign:'right'}}>{p.manhours!=null?Number(p.manhours).toLocaleString():'—'}</td>
                      <td style={{textAlign:'right'}}>{p.directCost!=null?'₹'+Number(p.directCost).toLocaleString():'—'}</td>
                      <td style={{textAlign:'right'}}>{p.proactiveDefect!=null?Number(p.proactiveDefect):'—'}</td>
                      <td style={{textAlign:'right'}}>{p.useCases!=null?Number(p.useCases):'—'}</td>
                      <td><span className={p.flagship?'bool-yes':'bool-no'}>{p.flagship?'✓':'—'}</span></td>
                      <td><span style={p.critical?{color:'#dc2626',fontWeight:700}:{color:'var(--text-light)'}}>{p.critical?'✓':'—'}</span></td>
                      <td><span className={p.mis?'bool-yes':'bool-no'}>{p.mis?'✓':'—'}</span></td>
                      <td style={{fontSize:'.75rem'}} title={getUserDetails(p.assignedStaffId)}>{getUserDetails(p.assignedStaffId)}</td>
                      {customCols.map(c=><td key={c.id} style={{fontSize:'.75rem'}}>{(p.customData||{})[c.id]||'—'}</td>)}
                      <td>{stage?<span className="stage-tag">{stage}</span>:'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {modal && <ProjectForm project={editing} readOnly={editing && user.role === 'deputy_manager' && editing.assignedStaffId !== user.email} ilPhases={IL_PHASES} onSave={handleSave} onDelete={handleDelete} onClose={() => setModal(false)} saving={saving}/>}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onImported={() => setImportOpen(false)} />}
      {showColMgr && <ColumnManager onClose={() => setShowColMgr(false)} />}
      {approvalOpen && <ApprovalModal project={approvalData.project} changes={approvalData.changes} onClose={() => setApprovalOpen(false)} onSent={() => setApprovalOpen(false)} />}
    </div>
  )
}
