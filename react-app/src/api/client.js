import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const s = sessionStorage.getItem('pmo_session')
  if (s) { try { const { token } = JSON.parse(s); if (token) config.headers.Authorization = `Bearer ${token}` } catch (_) {} }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) { sessionStorage.removeItem('pmo_session'); window.location.href = '/login' }
    return Promise.reject(err)
  }
)

export default api
