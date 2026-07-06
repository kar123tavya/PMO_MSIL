import { useEffect, useRef } from 'react'

export function useSSE(onEvent) {
  const esRef = useRef(null)

  useEffect(() => {
    const session = sessionStorage.getItem('pmo_session')
    if (!session) return
    let token
    try { token = JSON.parse(session).token } catch { return }

    const url = `/api/events?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    esRef.current = es

    es.addEventListener('connected', () => console.log('[SSE] Connected'))
    es.addEventListener('projects_changed', e => {
      try { onEvent('projects_changed', JSON.parse(e.data)) } catch (_) {}
    })
    es.addEventListener('settings_changed', e => {
      try { onEvent('settings_changed', JSON.parse(e.data)) } catch (_) {}
    })
    es.onerror = () => {
      console.warn('[SSE] Connection lost, will retry...')
      es.close()
      esRef.current = null
      setTimeout(() => {}, 5000)
    }

    return () => { es.close(); esRef.current = null }
  }, [])
}
