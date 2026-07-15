import React, { useState, useEffect, useMemo } from 'react'
import api from '../utils/api'

export default function DpmPerformance() {
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/projects'),
      api.get('/users')
    ]).then(([projRes, usrRes]) => {
      setProjects(projRes.data)
      setUsers(usrRes.data)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  function calculateDelta(project) {
    if (project.status === 'Live') {
      if (!project.liveTarget || !project.liveActual) return { days: 0, color: 'var(--text-muted)', text: 'N/A' }
      const tgt = new Date(project.liveTarget)
      const act = new Date(project.liveActual)
      const diff = Math.floor((act - tgt) / (1000 * 60 * 60 * 24))
      if (diff > 0) return { days: diff, color: 'var(--red)', text: `+${diff} days` }
      if (diff < 0) return { days: diff, color: 'var(--green)', text: `${diff} days` }
      return { days: 0, color: 'var(--text-muted)', text: '0 days' }
    }
    
    const phaseStatus = (project.status || '').toLowerCase()
    if (phaseStatus.startsWith('il')) {
      try {
        const phases = typeof project.il_phases === 'string' ? JSON.parse(project.il_phases) : (project.il_phases || [])
        const currentPhase = phases.find(p => p.id === phaseStatus)
        if (currentPhase && currentPhase.targetEnd && currentPhase.actualEnd) {
           const tgt = new Date(currentPhase.targetEnd)
           const act = new Date(currentPhase.actualEnd)
           const diff = Math.floor((act - tgt) / (1000 * 60 * 60 * 24))
           if (diff > 0) return { days: diff, color: 'var(--red)', text: `+${diff} days` }
           if (diff < 0) return { days: diff, color: 'var(--green)', text: `${diff} days` }
           return { days: 0, color: 'var(--text-muted)', text: '0 days' }
        }
      } catch (e) {
        console.error('Error parsing il_phases', e)
      }
    }
    return { days: 0, color: 'var(--text-muted)', text: 'N/A' }
  }

  const tableData = useMemo(() => {
    return projects.map(p => {
      // Find PIC
      const picUser = users.find(u => u.staff_no === p.assignedStaffId)
      const picName = picUser ? picUser.name : '--'
      
      // Resolve TL and SIC based on Project Division & PIC Section
      const division = p.division || picUser?.division
      const section = picUser?.section
      
      const tlUser = users.find(u => u.role === 'tl' && u.section === section && u.division === division)
      const sicUser = users.find(u => u.role === 'sic' && u.division === division)
      
      const tlName = tlUser ? tlUser.name : '--'
      const sicName = sicUser ? sicUser.name : '--'

      const delta = calculateDelta(p)
      
      const formatScore = (obj) => {
        if (!obj || (!obj.bu && !obj.pic && !obj.sic)) return '--'
        return `BU:${obj.bu||0}% P:${obj.pic||0}% S:${obj.sic||0}%`
      }

      const picScore = formatScore(p.effortScores?.pic)
      const sicScore = formatScore(p.effortScores?.sic)

      return {
        id: p._key,
        name: p.project,
        status: p.status,
        picName,
        tlName,
        sicName,
        delta,
        picScore,
        sicScore
      }
    })
  }, [projects, users])

  const exportCsv = () => {
    const headers = ['Project Name', 'Status', 'PIC', 'TL', 'SIC', 'Delta (Days)', 'PIC Submission', 'SIC Submission']
    const rows = tableData.map(r => [
      `"${r.name.replace(/"/g, '""')}"`,
      r.status,
      r.picName,
      r.tlName,
      r.sicName,
      r.delta.text,
      `"${r.picScore}"`,
      `"${r.sicScore}"`
    ])
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "Team_Performance_Report.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <div style={{padding:20}}>Loading performance data...</div>

  return (
    <div className="page-container" style={{padding: 24, maxWidth: 1400, margin: '0 auto'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 24}}>
        <h2 style={{margin:0, color:'var(--text-dark)'}}>Team Performance Overview</h2>
        <button className="btn btn-primary" onClick={exportCsv} style={{display:'flex', alignItems:'center', gap: 6}}>
          <span>⬇</span> Export CSV
        </button>
      </div>

      <div style={{background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto'}}>
        <table className="data-table" style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{background: 'var(--surface-2)', borderBottom: '2px solid var(--border)'}}>
              <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 600, color:'var(--text-muted)', fontSize: '0.85rem'}}>Project Name</th>
              <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 600, color:'var(--text-muted)', fontSize: '0.85rem'}}>Status</th>
              <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 600, color:'var(--text-muted)', fontSize: '0.85rem'}}>PIC</th>
              <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 600, color:'var(--text-muted)', fontSize: '0.85rem'}}>TL</th>
              <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 600, color:'var(--text-muted)', fontSize: '0.85rem'}}>SIC</th>
              <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 600, color:'var(--text-muted)', fontSize: '0.85rem'}}>Delta</th>
              <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 600, color:'var(--text-muted)', fontSize: '0.85rem'}}>PIC Score</th>
              <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 600, color:'var(--text-muted)', fontSize: '0.85rem'}}>SIC Score</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{padding: 20, textAlign: 'center', color: 'var(--text-muted)'}}>No projects found.</td>
              </tr>
            ) : (
              tableData.map(row => (
                <tr key={row.id} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: '12px 16px', fontSize: '0.9rem', fontWeight: 500}}>{row.name}</td>
                  <td style={{padding: '12px 16px', fontSize: '0.9rem'}}>{row.status}</td>
                  <td style={{padding: '12px 16px', fontSize: '0.85rem'}}>{row.picName}</td>
                  <td style={{padding: '12px 16px', fontSize: '0.85rem'}}>{row.tlName}</td>
                  <td style={{padding: '12px 16px', fontSize: '0.85rem'}}>{row.sicName}</td>
                  <td style={{padding: '12px 16px', fontSize: '0.9rem', fontWeight: 'bold', color: row.delta.color}}>
                    {row.delta.text}
                  </td>
                  <td style={{padding: '12px 16px', fontSize: '0.8rem', color:'var(--text-muted)'}}>{row.picScore}</td>
                  <td style={{padding: '12px 16px', fontSize: '0.8rem', color:'var(--text-muted)'}}>{row.sicScore}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
