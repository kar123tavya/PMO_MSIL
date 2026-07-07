import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import { useAuth } from '../context/AuthContext'

const DIVS  = ['Finance','Operations','IT','HR','Marketing','Sales','Legal & Compliance','Customer Service','Supply Chain','Strategy']
const THEMES= ['Digital Transformation','Customer Experience','Operational Excellence','Regulatory Compliance','Infrastructure','Innovation','Risk Management','Data & Analytics']
const CATS  = ['Process Automation','Analytics','Customer Facing','Compliance','Infrastructure','Innovation','Reporting','Integration']
const FYS   = ['2023-24','2024-25','2025-26','2026-27','2027-28']
const STATS = ['IL1','IL2','IL3','IL4','IL5','Live','On Hold','Cancelled']
const IL_COLORS=['#7c3aed','#0369a1','#15803d','#b45309','#b91c1c']
const IL_BGS   =['#ede9fe','#e0f2fe','#dcfce7','#fef9c3','#fee2e2']

const IL_PHASES = [
  {
    id: 'il1', label: 'IL1 – Ideation',
    subtasks: [
      'Business problem identification',
      'BRD Preparation & refinement',
      'Value Creation Framework (Cost benefit and ROI analysis)',
      'Project feasibility assessment (Technology Selection)',
    ],
  },
  {
    id: 'il2', label: 'IL2 – Approval',
    subtasks: [
      'Demand Approval and allocation to CoE',
      'Project requirement discussion with D&I along with Business user',
      'Technical feasibility assessment by DE',
      'Project Scope finalization with BRD sign-off',
      'Vendor Details Shared by DE for RFQ',
      'IPR / RFQ Ring Approval',
      'RFQ Float to vendor and Scope discussion',
      'Technical Evaluation of Vendor Proposals',
      'TEPO Ring (In case of Capital)',
      'Commercial Negotiation by DE',
      'Payment Ring Approval',
      'Vendor Onboarding',
      'Detailed requirement understanding through focused workshops',
      'Wireframe & Figma preparation',
    ],
  },
  {
    id: 'il3', label: 'IL3 – Design & Development',
    subtasks: [
      'Project detailed scope along with benefits',
      'Design Approval',
      'RFQ & Ring Approval process as in IL2 (Major Projects)',
      'Vendor Onboarding',
      'Solution Development',
      'Management Reviews as per Governance Mechanism',
    ],
  },
  {
    id: 'il4', label: 'IL4 – UAT',
    subtasks: [
      'User Acceptance Testing (UAT)',
      'UAT feedbacks incorporation',
      'UAT sign-off by User',
      'User Manual & Training Sessions for all Users',
    ],
  },
  {
    id: 'il5', label: 'IL5 – Live',
    subtasks: [
      'Live Deployment & Hypercare Support',
    ],
  },
]

function buildPhases(defs, saved) {
  const actualDefs = (defs && defs.length > 0) ? defs : IL_PHASES;
  return actualDefs.map(il => {
    const s = (saved||[]).find(x=>x.id===il.id)
    return {
      id: il.id, label: il.label,
      startDate: s?.startDate||'', endDate: s?.endDate||'',
      showArrow: s?.showArrow||false, phaseColor: s?.phaseColor||'',
      status: s?.status||'', done: s?.done||false,
      subtasks: il.subtasks.map((lbl,i)=>({
        label: lbl, done: s?.subtasks?.[i]?.done||false,
        startDate: s?.subtasks?.[i]?.startDate||'',
        endDate:   s?.subtasks?.[i]?.endDate||'',
      }))
    }
  })
}

export default function ProjectForm({ project, ilPhases, onSave, onDelete, onClose, saving, readOnly = false }) {
  const { can } = useAuth()
  const isEdit  = !!project

  const [users, setUsers] = useState([])
  useEffect(() => {
    fetch('/api/users').then(r=>r.json()).then(data=>{
      if (Array.isArray(data)) setUsers(data)
    }).catch(console.error)
  }, [])

  const [name,  setName]  = useState(project?.project||'')
  const [theme, setTheme] = useState(project?.theme||'')
  const [div,   setDiv]   = useState(project?.division||'')
  const [status,setStatus]= useState(project?.status||'')
  const [cat,   setCat]   = useState(project?.category||'')
  const [fy,    setFy]    = useState(project?.fy||'')
  const [ltgt,  setLtgt]  = useState(project?.liveTarget||'')
  const [lact,  setLact]  = useState(project?.liveActual||'')
  const [mh,    setMh]    = useState(project?.manhours??'')
  const [cost,  setCost]  = useState(project?.directCost??'')
  const [def,   setDef]   = useState(project?.proactiveDefect??'')
  const [uc,    setUc]    = useState(project?.useCases??'')
  const [flag,  setFlag]  = useState(project?.flagship||false)
  const [crit,  setCrit]  = useState(project?.critical||false)
  const [mis,   setMis]   = useState(project?.mis||false)
  const [tp,    setTp]    = useState(project?.thirdParty||false)
  const [ovr,   setOvr]   = useState(project?.overallStatus||'')
  const [staff, setStaff] = useState(project?.assignedStaffId||'')
  const [phases,setPhases]= useState(()=>buildPhases(ilPhases, project?.il_phases))

  function updPhaseDt(pi,f,v){ setPhases(ps=>ps.map((p,i)=>i!==pi?p:{...p,[f]:v})) }
  function updSubDt(pi,si,f,v){ setPhases(ps=>ps.map((p,i)=>i!==pi?p:{...p,subtasks:p.subtasks.map((s,j)=>j!==si?s:{...s,[f]:v})})) }
  function togSub(pi,si){ setPhases(ps=>ps.map((p,i)=>i!==pi?p:{...p,subtasks:p.subtasks.map((s,j)=>j!==si?s:{...s,done:!s.done})})) }
  function delSub(pi,si){ setPhases(ps=>ps.map((p,i)=>i!==pi?p:{...p,subtasks:p.subtasks.filter((_,j)=>j!==si)})) }
  
  async function handleAddSubtask(pi, phaseId) {
    const taskName = prompt("Enter new subtask name:")
    if (!taskName) return
    const isGlobal = confirm("Add globally to all projects?\n\n[OK] = Global\n[Cancel] = Specific to this project only")
    
    if (isGlobal) {
      if (!can('manage_settings')) return alert('You do not have permission to add global subtasks.')
      try {
        const res = await fetch(`/api/settings/phases/add_subtask`, {
          method: 'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ phaseId, taskName })
        })
        if (!res.ok) throw new Error('Failed to add global subtask')
        alert('Global subtask added successfully.')
        // Optimistically add to current view
        setPhases(ps=>ps.map((p,i)=>i!==pi?p:{...p,subtasks:[...p.subtasks, {label:taskName, done:false, startDate:'', endDate:''}]}))
      } catch (e) {
        alert(e.message)
      }
    } else {
      setPhases(ps=>ps.map((p,i)=>i!==pi?p:{...p,subtasks:[...p.subtasks, {label:taskName, done:false, startDate:'', endDate:''}]}))
    }
  }

  function submit(e){
    e.preventDefault()
    if(!name||!theme||!div) return alert('Project Name, Theme and Division are required.')
    onSave({
      _key: project?._key||'__new__',
      parentCode: project?.parentCode||null,
      project: name, theme, division: div, status, category: cat, fy,
      liveTarget: ltgt||null, liveActual: lact||null,
      manhours: parseFloat(mh)||null, directCost: parseFloat(cost)||null,
      proactiveDefect: parseFloat(def)||null, useCases: parseFloat(uc)||null,
      flagship: flag, critical: crit, mis, thirdParty: tp,
      overallStatus: ovr, il_phases: phases,
      phases: project?.phases||{}, customData: project?.customData||{},
      assignedStaffId: staff || null,
    })
  }

  return (
    <Modal open title={isEdit ? (readOnly ? 'View Project (Read-Only)' : 'Edit Project') : 'Add Project'} onClose={onClose} size="xl"
      footer={<>
        {isEdit&&can('delete_project')&&!readOnly&&<button className="btn btn-danger" style={{marginRight:'auto'}} onClick={()=>onDelete(project._key)}>Delete</button>}
        <button className="btn btn-ghost" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>
        {!readOnly && <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving?'Saving…':isEdit?'Update Project':'Add Project'}</button>}
      </>}
    >
      <div style={readOnly ? { pointerEvents: 'none', opacity: 0.95 } : {}}>
      <form onSubmit={submit}>
        <div className="form-section">
          <div className="form-section-title">Project Details</div>
          <div className="form-grid-2" style={{marginBottom:14}}>
            <div className="form-group"><label>Project Name *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter project name" required/></div>
            <div className="form-group"><label>Theme *</label>
              <select value={theme} onChange={e=>setTheme(e.target.value)} required>
                <option value="">Select theme</option>{THEMES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Division *</label>
              <select value={div} onChange={e=>setDiv(e.target.value)} required>
                <option value="">Select division</option>{DIVS.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value)}>
                <option value="">Select status</option>{STATS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Category</label>
              <select value={cat} onChange={e=>setCat(e.target.value)}>
                <option value="">Select category</option>{CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Financial Year</label>
              <select value={fy} onChange={e=>setFy(e.target.value)}>
                <option value="">Select FY</option>{FYS.map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Live Target Date</label><input type="date" value={ltgt} onChange={e=>setLtgt(e.target.value)}/></div>
            <div className="form-group"><label>Live Actual Date</label><input type="date" value={lact} onChange={e=>setLact(e.target.value)}/></div>
            <div className="form-group"><label>Assigned Staff</label>
              <select value={staff} onChange={e=>setStaff(e.target.value)}>
                <option value="">-- Unassigned --</option>
                {users.map(u => (
                  <option key={u.staff_no} value={u.staff_no}>
                    {u.staff_no ? `[${u.staff_no}] ` : ''}{u.name} ({u.designation || u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-grid-3" style={{marginBottom:14}}>
            <div className="form-group"><label>Man-hrs / Month</label><input type="number" value={mh}   onChange={e=>setMh(e.target.value)}   min="0"/></div>
            <div className="form-group"><label>Direct Cost (₹)</label><input type="number" value={cost} onChange={e=>setCost(e.target.value)} min="0"/></div>
            <div className="form-group"><label>Proactive Defects</label><input type="number" value={def} onChange={e=>setDef(e.target.value)} min="0"/></div>
            <div className="form-group"><label>Use Cases</label><input type="number" value={uc} onChange={e=>setUc(e.target.value)} min="0"/></div>
          </div>
          <div style={{display:'flex',gap:24,marginBottom:14,flexWrap:'wrap'}}>
            <label className="checkbox-row"><input type="checkbox" checked={flag} onChange={e=>setFlag(e.target.checked)}/> Flagship</label>
            <label className="checkbox-row"><input type="checkbox" checked={crit} onChange={e=>setCrit(e.target.checked)}/> Critical</label>
            <label className="checkbox-row"><input type="checkbox" checked={mis}  onChange={e=>setMis(e.target.checked)} /> MIS</label>
            <label className="checkbox-row"><input type="checkbox" checked={tp}   onChange={e=>setTp(e.target.checked)} /> 3rd Party</label>
          </div>
          <div className="form-group"><label>Current Status (As-on-date)</label><textarea rows={2} value={ovr} onChange={e=>setOvr(e.target.value)} placeholder="Overall current status / progress remark…"/></div>
        </div>

        <div className="form-section">
          <div className="form-section-title" style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{color:'var(--primary)'}}>📍</span> PHASE STATUS
          </div>
          <table style={{width:'100%', borderCollapse:'collapse', marginTop:10}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)', background:'var(--surface-2)'}}>
                <th style={{textAlign:'left', padding:'8px', fontSize:'0.7rem', color:'var(--text-muted)'}}>PHASE</th>
                <th style={{textAlign:'left', padding:'8px', fontSize:'0.7rem', color:'var(--text-muted)'}}>PHASE COLOR</th>
                <th style={{textAlign:'left', padding:'8px', fontSize:'0.7rem', color:'var(--text-muted)'}}>TARGET DATE</th>
                <th style={{textAlign:'left', padding:'8px', fontSize:'0.7rem', color:'var(--text-muted)'}}>ACTUAL DATE</th>
                <th style={{textAlign:'center', padding:'8px', fontSize:'0.7rem', color:'var(--text-muted)'}}>SHOW ARROW?</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((ph, pi) => (
                <tr key={ph.id} style={{borderBottom:'1px solid var(--border-light)'}}>
                  <td style={{padding:'8px', fontSize:'0.8rem', fontWeight:600, color:'var(--text-main)'}}>
                    {ph.label.split('–')[1]?.trim() || ph.label}
                  </td>
                  <td style={{padding:'8px'}}>
                    <select 
                      value={ph.phaseColor || ph.status || ''} 
                      onChange={e => updPhaseDt(pi, 'phaseColor', e.target.value)}
                      style={{width:'100%', padding:'6px', border:'1px solid var(--border)', borderRadius:4, fontSize:'0.75rem', background:'var(--surface)'}}
                    >
                      <option value="">— None —</option>
                      <option value="blue">Blue (Not Started)</option>
                      <option value="yellow">Yellow (In Progress)</option>
                      <option value="green">Green (Completed)</option>
                      <option value="red">Red (Delayed/On Hold)</option>
                    </select>
                  </td>
                  <td style={{padding:'8px'}}>
                    <div style={{position:'relative'}}>
                      <span style={{position:'absolute', left:8, top:8, fontSize:'0.7rem', color:'var(--text-muted)', pointerEvents:'none'}}>Target:</span>
                      <input 
                        type="date" 
                        value={ph.startDate} 
                        onChange={e => updPhaseDt(pi, 'startDate', e.target.value)}
                        style={{width:'100%', padding:'6px 6px 6px 48px', border:'1px solid var(--border)', borderRadius:4, fontSize:'0.75rem'}}
                      />
                    </div>
                  </td>
                  <td style={{padding:'8px'}}>
                    <div style={{position:'relative'}}>
                      <span style={{position:'absolute', left:8, top:8, fontSize:'0.7rem', color:'var(--text-muted)', pointerEvents:'none'}}>Actual:</span>
                      <input 
                        type="date" 
                        value={ph.endDate} 
                        onChange={e => updPhaseDt(pi, 'endDate', e.target.value)}
                        style={{width:'100%', padding:'6px 6px 6px 48px', border:'1px solid var(--border)', borderRadius:4, fontSize:'0.75rem'}}
                      />
                    </div>
                  </td>
                  <td style={{padding:'8px', textAlign:'center'}}>
                    {pi < phases.length - 1 && (
                      <input 
                        type="checkbox" 
                        checked={ph.showArrow || false} 
                        onChange={e => updPhaseDt(pi, 'showArrow', e.target.checked)}
                        style={{width:16, height:16, cursor:'pointer'}}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="form-section-title" style={{display:'flex', alignItems:'center', gap:8, marginTop:24}}>
            <span style={{color:'var(--primary)'}}>📋</span> PHASE SUB-TASKS <span style={{fontSize:'0.65rem', color:'var(--text-muted)'}}>(Optional detailed tracking for Gantt)</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:16, marginTop:10}}>
            {phases.map((ph, pi) => (
              <div key={`sub-${ph.id}`} className="il-phase-block" style={{borderColor:IL_COLORS[pi], background:IL_BGS[pi]+'15', padding:12, borderRadius:6, border:'1px solid '+IL_COLORS[pi]+'44'}}>
                <div className="il-subtasks-title" style={{display:'flex',justifyContent:'space-between', marginBottom:8, borderBottom:'1px solid '+IL_COLORS[pi]+'22', paddingBottom:6}}>
                  <strong style={{color:IL_COLORS[pi], fontSize:'0.75rem'}}>{ph.id.toUpperCase()} - {ph.label.split('–')[1]?.trim() || ph.label}</strong>
                  <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'2px 6px',color:IL_COLORS[pi]}} onClick={()=>handleAddSubtask(pi, ph.id)}>+ Add Subtask</button>
                </div>
                {ph.subtasks.map((st, si) => (
                  <div key={si} className="il-sub-item" style={{display:'flex', alignItems:'center', gap:10, marginBottom:4}}>
                    <input className="il-sub-check" type="checkbox" checked={st.done} onChange={()=>togSub(pi,si)} style={{width:14, height:14, cursor:'pointer'}}/>
                    <input className="il-sub-label" value={st.label} onChange={e=>updSubDt(pi,si,'label',e.target.value)} style={{flex:1, fontSize:'0.75rem', background:'transparent', border:'none', borderBottom:'1px dashed var(--border)', padding:'2px', ...(st.done?{textDecoration:'line-through',color:'var(--text-light)'}:{})}} />
                    <button type="button" onClick={()=>delSub(pi,si)} style={{background:'none', border:'none', color:'var(--red)', cursor:'pointer', padding:'0 4px', fontSize:'0.8rem'}} title="Delete subtask">✕</button>
                    <div className="il-sub-dates" style={{display:'flex', gap:6, alignItems:'center', marginLeft:8}}>
                      <input type="date" value={st.startDate} onChange={e=>updSubDt(pi,si,'startDate',e.target.value)} style={{padding:'2px 4px', fontSize:'0.7rem', border:'1px solid var(--border)'}}/>
                      <span style={{color:'var(--text-muted)'}}>→</span>
                      <input type="date" value={st.endDate} onChange={e=>updSubDt(pi,si,'endDate',e.target.value)} style={{padding:'2px 4px', fontSize:'0.7rem', border:'1px solid var(--border)'}}/>
                    </div>
                  </div>
                ))}
                {ph.subtasks.length === 0 && <div style={{fontSize:'0.7rem', color:'var(--text-light)', fontStyle:'italic'}}>No sub-tasks configured.</div>}
              </div>
            ))}
          </div>
        </div>
        </form>
      </div>
      </Modal>
    )
  }
