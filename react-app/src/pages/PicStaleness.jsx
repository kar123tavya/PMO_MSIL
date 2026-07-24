import React, { useState, useMemo, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { useProjects } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

// Calculates days between now and given date string
function getDeltaDays(dateStr) {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  if (isNaN(d)) return 999;
  const diffTime = Math.max(0, new Date() - d); // avoid negative if future
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Returns dynamic heatmap colors based on staleness
function getStalenessStyle(days) {
  if (days <= 10) {
    // Very light red (0-10 days)
    return { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' }
  } else if (days <= 60) {
    // Medium red (11-60 days)
    return { bg: '#f87171', color: '#ffffff', border: '#ef4444' }
  } else {
    // Very dark red (> 60 days)
    return { bg: '#7f1d1d', color: '#ffffff', border: '#450a0a' }
  }
}

export default function PicStaleness() {
  const { projects } = useProjects()
  const { user } = useAuth()
  const [usersMap, setUsersMap] = useState({})
  const [search, setSearch] = useState('')
  const [expandedPics, setExpandedPics] = useState({})

  // Fetch users mapping once to display names properly
  useEffect(() => {
    api.get('/users').then(res => {
      const map = {}
      res.data.forEach(u => map[u.email] = u.name || u.email)
      setUsersMap(map)
    }).catch(console.error)
  }, [])

  // Group projects by PIC and calculate staleness
  const picData = useMemo(() => {
    const groups = {}
    
    projects.forEach(p => {
      const picEmail = p.assignedTo;
      if (!picEmail) return; // Skip unassigned projects
      
      if (!groups[picEmail]) {
        groups[picEmail] = {
          email: picEmail,
          name: usersMap[picEmail] || picEmail,
          projects: []
        }
      }
      
      const days = getDeltaDays(p.updatedAt);
      groups[picEmail].projects.push({ ...p, deltaDays: days });
    });

    // Process and sort each PIC's projects
    const result = Object.values(groups).map(pic => {
      // Sort projects oldest first (highest delta)
      pic.projects.sort((a, b) => b.deltaDays - a.deltaDays);
      pic.mostStaleProject = pic.projects[0];
      return pic;
    });

    // Sort PICs overall by whoever has the absolute most stale project
    result.sort((a, b) => (b.mostStaleProject?.deltaDays || 0) - (a.mostStaleProject?.deltaDays || 0));

    return result;
  }, [projects, usersMap]);

  // Client-side search
  const filteredData = useMemo(() => {
    if (!search) return picData;
    const q = search.toLowerCase();
    return picData.filter(pic => 
      pic.name.toLowerCase().includes(q) || 
      pic.email.toLowerCase().includes(q) ||
      pic.projects.some(p => p.project.toLowerCase().includes(q))
    );
  }, [picData, search]);

  const toggleExpand = (email) => {
    setExpandedPics(prev => ({ ...prev, [email]: !prev[email] }));
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header title="PIC Update Tracker" searchValue={search} onSearch={setSearch} />
        
        <div className="page-content" style={{ maxWidth: 1000, margin: '0 auto' }}>
          
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '16px', marginBottom: 24 }}>
            <h3 style={{ color: '#1e40af', margin: '0 0 8px 0', fontSize: '1rem' }}>Activity Heatmap</h3>
            <p style={{ color: '#3b82f6', margin: 0, fontSize: '0.85rem' }}>
              This page tracks how long it has been since a project was updated. 
              The most neglected projects appear at the top. Click on any PIC to view all their assigned projects.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: '#fef2f2', border: '1px solid #fca5a5' }}></span> 0 - 10 Days
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: '#f87171', border: '1px solid #ef4444' }}></span> 11 - 60 Days
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: '#7f1d1d', border: '1px solid #450a0a' }}></span> 2+ Months
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredData.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                No PICs or assigned projects found.
              </div>
            )}

            {filteredData.map(pic => {
              const isExpanded = !!expandedPics[pic.email];
              const maxStaleDays = pic.mostStaleProject?.deltaDays || 0;
              const style = getStalenessStyle(maxStaleDays);
              
              return (
                <div key={pic.email} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  
                  {/* Main Row */}
                  <div 
                    onClick={() => toggleExpand(pic.email)}
                    style={{ 
                      padding: '16px 20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isExpanded ? 'var(--surface-2)' : 'var(--surface)',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem' }}>
                        {pic.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-strong)' }}>{pic.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pic.projects.length} Assigned Project(s)</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Most Stale Project</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {pic.mostStaleProject?.project}
                          </span>
                          <span style={{
                            padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                            background: style.bg, color: style.color, border: `1px solid ${style.border}`
                          }}>
                            {maxStaleDays === 999 ? 'Never Updated' : `${maxStaleDays} Days Ago`}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Expanded Projects List */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', background: '#fafafa' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>Project Name</th>
                            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>Status</th>
                            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>Last Updated Date</th>
                            <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>Staleness</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pic.projects.map(p => {
                            const pStyle = getStalenessStyle(p.deltaDays);
                            return (
                              <tr key={p.id}>
                                <td style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-strong)' }}>{p.project}</td>
                                <td style={{ padding: '12px', fontSize: '0.8rem' }}>
                                  <span className="badge" style={{background: 'var(--surface-2)'}}>{p.status || 'No Status'}</span>
                                </td>
                                <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'Never'}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                  <span style={{
                                    padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                                    background: pStyle.bg, color: pStyle.color, border: `1px solid ${pStyle.border}`
                                  }}>
                                    {p.deltaDays === 999 ? 'Never Updated' : `${p.deltaDays} Days Ago`}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}
