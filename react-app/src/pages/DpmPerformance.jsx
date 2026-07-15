import React, { useState, useEffect, useMemo } from 'react'
import api from '../api/client'

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
    <div className="page-container" style={{
      padding: 32, 
      maxWidth: 1500, 
      margin: '0 auto',
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, rgba(0,86,179,0.05), transparent 40%), radial-gradient(circle at bottom left, rgba(0,86,179,0.03), transparent 40%)'
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 32}}>
        <div>
          <h2 style={{
            margin:0, 
            fontSize: '1.8rem',
            fontWeight: 800,
            background: 'linear-gradient(90deg, #1e293b 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px'
          }}>Team Performance Overview</h2>
          <p style={{margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem'}}>Live tracking of project timelines and effort distribution</p>
        </div>
        <button className="btn" onClick={exportCsv} style={{
          display:'flex', 
          alignItems:'center', 
          gap: 8,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: 8,
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span style={{fontSize:'1.1rem'}}>⬇</span> Export CSV Report
        </button>
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.8)', 
        backdropFilter: 'blur(12px)',
        borderRadius: 16, 
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)', 
        border: '1px solid rgba(255,255,255,0.4)',
        overflow: 'hidden'
      }}>
        <table className="data-table" style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{background: 'rgba(248, 250, 252, 0.8)'}}>
              <th style={{padding: '16px 20px', textAlign: 'left', fontWeight: 700, color:'#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0'}}>Project Name</th>
              <th style={{padding: '16px 20px', textAlign: 'left', fontWeight: 700, color:'#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0'}}>Status</th>
              <th style={{padding: '16px 20px', textAlign: 'left', fontWeight: 700, color:'#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0'}}>PIC</th>
              <th style={{padding: '16px 20px', textAlign: 'left', fontWeight: 700, color:'#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0'}}>TL</th>
              <th style={{padding: '16px 20px', textAlign: 'left', fontWeight: 700, color:'#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0'}}>SIC</th>
              <th style={{padding: '16px 20px', textAlign: 'left', fontWeight: 700, color:'#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0'}}>Delta</th>
              <th style={{padding: '16px 20px', textAlign: 'left', fontWeight: 700, color:'#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0'}}>PIC Score</th>
              <th style={{padding: '16px 20px', textAlign: 'left', fontWeight: 700, color:'#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0'}}>SIC Score</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem'}}>No projects found.</td>
              </tr>
            ) : (
              tableData.map((row, idx) => (
                <tr key={row.id} 
                  style={{
                    borderBottom: idx === tableData.length - 1 ? 'none' : '1px solid #f1f5f9',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{padding: '16px 20px', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a'}}>{row.name}</td>
                  <td style={{padding: '16px 20px'}}>
                    <span style={{
                      background: row.status === 'Live' ? '#dcfce7' : '#e0e7ff', 
                      color: row.status === 'Live' ? '#166534' : '#3730a3',
                      padding: '4px 10px', 
                      borderRadius: 20, 
                      fontSize: '0.75rem', 
                      fontWeight: 700
                    }}>{row.status}</span>
                  </td>
                  <td style={{padding: '16px 20px', fontSize: '0.9rem', color: '#334155'}}>{row.picName}</td>
                  <td style={{padding: '16px 20px', fontSize: '0.9rem', color: '#334155'}}>{row.tlName}</td>
                  <td style={{padding: '16px 20px', fontSize: '0.9rem', color: '#334155'}}>{row.sicName}</td>
                  <td style={{padding: '16px 20px'}}>
                    <span style={{
                      display: 'inline-block',
                      background: row.delta.text === 'N/A' || row.delta.text === '0 days' ? '#f1f5f9' : (row.delta.color === 'var(--green)' ? '#dcfce7' : '#fee2e2'),
                      color: row.delta.text === 'N/A' || row.delta.text === '0 days' ? '#64748b' : (row.delta.color === 'var(--green)' ? '#166534' : '#991b1b'),
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      boxShadow: row.delta.text !== 'N/A' && row.delta.text !== '0 days' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                    }}>
                      {row.delta.text}
                    </span>
                  </td>
                  <td style={{padding: '16px 20px', fontSize: '0.85rem', color:'#64748b', fontFamily: 'monospace'}}>{row.picScore}</td>
                  <td style={{padding: '16px 20px', fontSize: '0.85rem', color:'#64748b', fontFamily: 'monospace'}}>{row.sicScore}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
