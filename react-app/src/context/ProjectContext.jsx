import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { useSSE } from '../api/useSSE'
import { useAuth } from './AuthContext'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [users, setUsers]       = useState([])
  const [settings, setSettings] = useState({ customColumns: [], ilPhases: [] })
  const [loading, setLoading]   = useState(true)

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/projects')
      setProjects(data)
    } catch (e) { console.error('Failed to fetch projects', e) }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users')
      setUsers(data)
    } catch (e) { console.error('Failed to fetch users', e) }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const [cols, phases] = await Promise.all([
        api.get('/settings/columns'),
        api.get('/settings/il_phases'),
      ])
      setSettings({
        customColumns: Array.isArray(cols.data) ? cols.data : (cols.data.value || []),
        ilPhases: phases.data.value || [],
      })
    } catch (e) { console.error('Failed to fetch settings', e) }
  }, [])

  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
        setProjects([])
        setUsers([])
        setLoading(false)
        return
    }
    setLoading(true)
    Promise.all([fetchProjects(), fetchUsers(), fetchSettings()])
      .finally(() => setLoading(false))
  }, [user, fetchProjects, fetchUsers, fetchSettings])

  useSSE((event, data) => {
    if (event === 'projects_changed') setProjects(data)
    if (event === 'settings_changed') {
      if (data.key === 'custom_columns') setSettings(s => ({ ...s, customColumns: data.value }))
      if (data.key === 'il_phases')      setSettings(s => ({ ...s, ilPhases: data.value }))
    }
  })

  const saveProject = useCallback(async (project) => {
    const { _key, ...body } = project
    if (_key && _key !== '__new__') {
      const res = await api.put(`/projects/${_key}`, body)
      return res
    } else {
      const { data } = await api.post('/projects', body)
      return data.id
    }
  }, [])

  const deleteProject = useCallback(async (key) => {
    await api.delete(`/projects/${key}`)
  }, [])

  const saveUser = useCallback(async (user) => {
    const { data } = await api.post('/users', user)
    await fetchUsers()
    return data.uid
  }, [fetchUsers])

  const deleteUser = useCallback(async (uid) => {
    await api.delete(`/users/${uid}`)
    await fetchUsers()
  }, [fetchUsers])

  return (
    <ProjectContext.Provider value={{
      projects, users, settings, loading,
      saveProject, deleteProject, saveUser, deleteUser,
      refetchProjects: fetchProjects, refetchUsers: fetchUsers,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProjects = () => useContext(ProjectContext)
