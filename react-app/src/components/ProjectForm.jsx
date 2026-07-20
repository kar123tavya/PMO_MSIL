import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import { useAuth } from '../context/AuthContext'
import { useProjects } from '../context/ProjectContext'
import api from '../api/client'

const DIVS  = ['MQ', 'ND', 'PQ-MP', 'PQ-NPD', 'COP', 'PDS', 'VI', 'VU', 'MA', 'VQ']
const THEMES= ['Efficiency improvement', 'Enterprise Level', 'Multilocation control', 'Startup collaboration for technology adoption']
const CATS  = ['Analytics & Digital', 'Bots', 'Dashboard', 'GenAI', 'PowerApps & Portal']
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
      targetStart: s?.targetStart||'', targetEnd: s?.targetEnd||'',
      actualStart: s?.actualStart||'', actualEnd: s?.actualEnd||'',
      showArrow: s?.showArrow||false, phaseColor: s?.phaseColor||'',
      status: s?.status||'', done: s?.done||false,
      subtasks: il.subtasks.map((lbl,i)=>({
        label: lbl, done: s?.subtasks?.[i]?.done||false,
        startDate: s?.subtasks?.[i]?.startDate||'',
        endDate:   s?.subtasks?.[i]?.endDate||'',
        targetStart: s?.subtasks?.[i]?.targetStart||'',
        targetEnd:   s?.subtasks?.[i]?.targetEnd||'',
        actualStart: s?.subtasks?.[i]?.actualStart||'',
        actualEnd:   s?.subtasks?.[i]?.actualEnd||'',
      }))
    }
  })
}

export default function ProjectForm({ project, ilPhases, onSave, onDelete, onClose, saving, readOnly = false }) {
  const { can, user } = useAuth()
  const { projects } = useProjects()
  const isEdit  = !!project

  const dynamicDivs = [...new Set([...DIVS, ...(projects || []).map(p=>p.division).filter(Boolean)])].sort()
  const dynamicThemes = [...new Set([...THEMES, ...(projects || []).map(p=>p.theme).filter(Boolean)])].sort()
  const dynamicCats = [...new Set([...CATS, ...(projects || []).map(p=>p.category).filter(Boolean)])].sort()

  const [users, setUsers] = useState([])
  useEffect(() => {
    api.get('/users').then(({ data }) => {
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
  const [buEmail, setBuEmail] = useState(project?.buEmail||'')
  const [il4Learnings, setIl4Learnings] = useState(project?.il4Learnings||'')
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
      buEmail: buEmail || null,
      il4Learnings: il4Learnings || null,
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
              <input list="themes-list" value={theme} onChange={e=>setTheme(e.target.value)} placeholder="Type or select theme" required />
              <datalist id="themes-list">
                {dynamicThemes.map(t=><option key={t} value={t} />)}
              </datalist>
            </div>
            <div className="form-group"><label>Division *</label>
              <input list="divs-list" value={div} onChange={e=>setDiv(e.target.value)} placeholder="Type or select division" required />
              <datalist id="divs-list">
                {dynamicDivs.map(d=><option key={d} value={d} />)}
              </datalist>
            </div>
            <div className="form-group"><label>Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value)}>
                <option value="">Select status</option>{STATS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Category</label>
              <input list="cats-list" value={cat} onChange={e=>setCat(e.target.value)} placeholder="Type or select category" />
              <datalist id="cats-list">
                {dynamicCats.map(c=><option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="form-group"><label>Financial Year</label>
              <select value={fy} onChange={e=>setFy(e.target.value)}>
                <option value="">Select FY</option>{FYS.map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Live Target Date</label><input type="date" value={ltgt} onChange={e=>setLtgt(e.target.value)}/></div>
            <div className="form-group"><label>Live Actual Date</label><input type="date" value={lact} onChange={e=>setLact(e.target.value)}/></div>
            <div className="form-group"><label>Assigned Staff (PIC)</label>
              <select value={staff} onChange={e=>setStaff(e.target.value)}>
                <option value="">-- Unassigned --</option>
                {users.map(u => (
                  <option key={u.staff_no} value={u.staff_no}>
                    {u.staff_no ? `[${u.staff_no}] ` : ''}{u.name} ({u.designation || u.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group"><label>Business User (BU) Email</label><input type="email" value={buEmail} onChange={e=>setBuEmail(e.target.value)} placeholder="BU's Email ID"/></div>
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
          <div className="form-group"><label>IL4 - New Changes & Learnings</label><textarea rows={2} value={il4Learnings} onChange={e=>setIl4Learnings(e.target.value)} placeholder="Document any new changes or learnings from UAT (PIC)..."/></div>
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
                <th style={{textAlign:'left', padding:'8px', fontSize:'0.7rem', color:'var(--text-muted)'}}>REMARKS</th>
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
                    <div style={{position:'relative', marginBottom: 4}}>
                      <span style={{position:'absolute', left:8, top:8, fontSize:'0.7rem', color:'var(--text-muted)', pointerEvents:'none'}}>Start:</span>
                      <input 
                        type="date" 
                        value={ph.targetStart || ''} 
                        onChange={e => updPhaseDt(pi, 'targetStart', e.target.value)}
                        style={{width:'100%', padding:'6px 6px 6px 42px', border:'1px solid var(--border)', borderRadius:4, fontSize:'0.75rem'}}
                      />
                    </div>
                    <div style={{position:'relative'}}>
                      <span style={{position:'absolute', left:8, top:8, fontSize:'0.7rem', color:'var(--text-muted)', pointerEvents:'none'}}>End:</span>
                      <input 
                        type="date" 
                        value={ph.targetEnd || ph.startDate || ''} 
                        onChange={e => updPhaseDt(pi, 'targetEnd', e.target.value)}
                        style={{width:'100%', padding:'6px 6px 6px 42px', border:'1px solid var(--border)', borderRadius:4, fontSize:'0.75rem'}}
                      />
                    </div>
                  </td>
                  <td style={{padding:'8px'}}>
                    <div style={{position:'relative', marginBottom: 4}}>
                      <span style={{position:'absolute', left:8, top:8, fontSize:'0.7rem', color:'var(--text-muted)', pointerEvents:'none'}}>Start:</span>
                      <input 
                        type="date" 
                        value={ph.actualStart || ''} 
                        onChange={e => updPhaseDt(pi, 'actualStart', e.target.value)}
                        style={{width:'100%', padding:'6px 6px 6px 42px', border:'1px solid var(--border)', borderRadius:4, fontSize:'0.75rem'}}
                      />
                    </div>
                    <div style={{position:'relative'}}>
                      <span style={{position:'absolute', left:8, top:8, fontSize:'0.7rem', color:'var(--text-muted)', pointerEvents:'none'}}>End:</span>
                      <input 
                        type="date" 
                        value={ph.actualEnd || ph.endDate || ''} 
                        onChange={e => updPhaseDt(pi, 'actualEnd', e.target.value)}
                        style={{width:'100%', padding:'6px 6px 6px 42px', border:'1px solid var(--border)', borderRadius:4, fontSize:'0.75rem'}}
                      />
                    </div>
                  </td>
                  <td style={{padding:'8px'}}>
                    <textarea 
                      rows={2}
                      value={ph.remark || ''} 
                      onChange={e => updPhaseDt(pi, 'remark', e.target.value)}
                      placeholder="Hover reason..."
                      style={{width:'100%', padding:'6px', border:'1px solid var(--border)', borderRadius:4, fontSize:'0.75rem', minWidth: '120px'}}
                    />
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
                    <div className="il-sub-dates" style={{display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end', marginLeft:8}}>
                      <div style={{display:'flex', gap:6, alignItems:'center'}}>
                        <span style={{fontSize:'0.65rem', color:'var(--text-muted)', width: 35, textAlign:'right'}}>Target:</span>
                        <input type="date" value={st.targetStart || st.startDate || ''} onChange={e=>updSubDt(pi,si,'targetStart',e.target.value)} style={{padding:'2px 4px', fontSize:'0.7rem', border:'1px solid var(--border)'}}/>
                        <span style={{color:'var(--text-muted)'}}>→</span>
                        <input type="date" value={st.targetEnd || st.endDate || ''} onChange={e=>updSubDt(pi,si,'targetEnd',e.target.value)} style={{padding:'2px 4px', fontSize:'0.7rem', border:'1px solid var(--border)'}}/>
                      </div>
                      <div style={{display:'flex', gap:6, alignItems:'center'}}>
                        <span style={{fontSize:'0.65rem', color:'var(--text-muted)', width: 35, textAlign:'right'}}>Actual:</span>
                        <input type="date" value={st.actualStart || ''} onChange={e=>updSubDt(pi,si,'actualStart',e.target.value)} style={{padding:'2px 4px', fontSize:'0.7rem', border:'1px solid var(--border)'}}/>
                        <span style={{color:'var(--text-muted)'}}>→</span>
                        <input type="date" value={st.actualEnd || ''} onChange={e=>updSubDt(pi,si,'actualEnd',e.target.value)} style={{padding:'2px 4px', fontSize:'0.7rem', border:'1px solid var(--border)'}}/>
                      </div>
                    </div>
                  </div>
                ))}
                {ph.subtasks.length === 0 && <div style={{fontSize:'0.7rem', color:'var(--text-light)', fontStyle:'italic'}}>No sub-tasks configured.</div>}
              </div>
            ))}
          </div>
        </div>
        
        {(isEdit && (status === 'IL5' || status === 'Live') && (user?.role === 'pic' || user?.role === 'sic' || user?.role === 'dpm' || user?.role === 'admin')) && (
          <div className="form-section" style={{marginTop: 20}}>
            <div className="form-section-title" style={{display:'flex', alignItems:'center', gap:8}}>
              <span style={{color:'var(--primary)'}}>🔒</span> CONFIDENTIAL EFFORT SCORING (IL5 / LIVE)
            </div>
            {user?.role === 'dpm' || user?.role === 'admin' ? (
              <div style={{marginTop:10, padding: 12, background: 'var(--surface-2)', borderRadius: 6}}>
                <h4 style={{fontSize:'0.8rem', marginBottom:8}}>DPM View (Scores Submitted)</h4>
                <div style={{display:'flex', gap:20}}>
                  <div style={{flex: 1, padding: 10, background: 'white', borderRadius: 4, border: '1px solid var(--border)'}}>
                    <strong style={{fontSize:'0.75rem'}}>PIC's Submission:</strong>
                    <div style={{fontSize:'0.8rem', marginTop: 4}}>BU: {project?.effortScores?.pic?.bu || 0}%</div>
                    <div style={{fontSize:'0.8rem'}}>PIC: {project?.effortScores?.pic?.pic || 0}%</div>
                    <div style={{fontSize:'0.8rem'}}>SIC: {project?.effortScores?.pic?.sic || 0}%</div>
                  </div>
                  <div style={{flex: 1, padding: 10, background: 'white', borderRadius: 4, border: '1px solid var(--border)'}}>
                    <strong style={{fontSize:'0.75rem'}}>SIC's Submission:</strong>
                    <div style={{fontSize:'0.8rem', marginTop: 4}}>BU: {project?.effortScores?.sic?.bu || 0}%</div>
                    <div style={{fontSize:'0.8rem'}}>PIC: {project?.effortScores?.sic?.pic || 0}%</div>
                    <div style={{fontSize:'0.8rem'}}>SIC: {project?.effortScores?.sic?.sic || 0}%</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{marginTop:10, padding: 12, background: 'var(--surface-2)', borderRadius: 6}}>
                <p style={{fontSize:'0.75rem', marginBottom:10, color:'var(--text-muted)'}}>
                  Submit your confidential assessment of effort contribution. (Must sum to 100). This will only be visible to the DPM.
                </p>
                <div style={{display:'flex', gap: 10, alignItems: 'center'}}>
                  <div style={{display:'flex', flexDirection:'column'}}>
                    <label style={{fontSize:'0.7rem'}}>BU/DE %</label>
                    <input id="es_bu" type="number" min="0" max="100" defaultValue={project?.effortScores?.[user.role]?.bu || ""} style={{width: 70, padding: '4px'}} />
                  </div>
                  <div style={{display:'flex', flexDirection:'column'}}>
                    <label style={{fontSize:'0.7rem'}}>PIC %</label>
                    <input id="es_pic" type="number" min="0" max="100" defaultValue={project?.effortScores?.[user.role]?.pic || ""} style={{width: 70, padding: '4px'}} />
                  </div>
                  <div style={{display:'flex', flexDirection:'column'}}>
                    <label style={{fontSize:'0.7rem'}}>SIC %</label>
                    <input id="es_sic" type="number" min="0" max="100" defaultValue={project?.effortScores?.[user.role]?.sic || ""} style={{width: 70, padding: '4px'}} />
                  </div>
                  <button type="button" className="btn btn-primary" style={{marginTop: 14}} onClick={async (e) => {
                    e.preventDefault();
                    const bu = parseInt(document.getElementById('es_bu').value || 0);
                    const pic = parseInt(document.getElementById('es_pic').value || 0);
                    const sic = parseInt(document.getElementById('es_sic').value || 0);
                    if (bu + pic + sic !== 100) return alert('Scores must sum to exactly 100%!');
                    try {
                      const res = await api.post(`/projects/${project._key}/effort_score`, { bu, pic, sic });
                      alert('Confidential score submitted successfully!');
                    } catch(err) {
                      alert('Failed to submit score: ' + err.message);
                    }
                  }}>Submit Score</button>
                </div>
              </div>
            )}
          </div>
        )}
        </form>
      </div>
      </Modal>
    )
  }
