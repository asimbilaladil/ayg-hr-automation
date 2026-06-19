import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 15000,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hr_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hr_token')
      localStorage.removeItem('hr_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/users/me'),
}

// ── Candidates ───────────────────────────────────────────────────────────────
export const candidatesApi = {
  list: (params) => api.get('/api/candidates', { params }),
  getById: (id) => api.get(`/api/candidates/${id}`),
  update: (id, data) => api.patch(`/api/candidates/${id}`, data),
  remove: (id) => api.delete(`/api/candidates/${id}`),
  getResume: (emailId) => api.get(`/api/candidates/resume/${emailId}`),
  getAllManagers: () => api.get('/api/availability/managers/list'),
  getManagerLocations: (managerId) => api.get(`/api/availability/managers/${managerId}/locations`),
  getAllPostings: () => api.get('/api/postings/list'),
  getAllLocations: () => api.get('/api/availability/locations/list'),
}

// ── Appointments ─────────────────────────────────────────────────────────────
export const appointmentsApi = {
  list: (params) => api.get('/api/appointments', { params }),
  getById: (id) => api.get(`/api/appointments/${id}`),
  update: (id, data) => api.patch(`/api/appointments/${id}`, data),
  remove: (id) => api.delete(`/api/appointments/${id}`),
  cancel: (id, reason) => api.delete(`/api/appointments/${id}/cancel`, { data: { reason } }),
  bulkCancel: (ids, reason) => api.post('/api/appointments/bulk-cancel', { ids, reason }),
}

// ── Availability ─────────────────────────────────────────────────────────────
export const availabilityApi = {
  list: (params) => api.get('/api/availability', { params }),
  getById: (id) => api.get(`/api/availability/${id}`),
  create: (data) => api.post('/api/availability', data),
  update: (id, data) => api.patch(`/api/availability/${id}`, data),
  remove: (id) => api.delete(`/api/availability/${id}`),
  // ✅ NEW: Dropdowns data
  getAllManagers: () => api.get('/api/availability/managers/list'),
  getManagerLocations: (managerId) => api.get(`/api/availability/managers/${managerId}/locations`),
  getAllLocations: () => api.get('/api/availability/locations/list'),
}

// ── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/api/users'),
  create: (data) => api.post('/api/users', data),
  updateRole: (id, role) => api.patch(`/api/users/${id}/role`, { role }),
  deactivate: (id) => api.patch(`/api/users/${id}/deactivate`),
  updateEmail: (id, email) => api.patch(`/api/users/${id}/email`, { email }),
  resetPassword: (id) => api.post(`/api/users/${id}/reset-password`),
  changePassword: (currentPassword, newPassword) =>
    api.post('/api/users/me/change-password', { currentPassword, newPassword }),
  swapPreview: (managerAId, managerBId) =>
    api.get('/api/users/swap-preview', { params: { managerAId, managerBId } }),
  swapLocations: (managerAId, managerBId) =>
    api.post('/api/users/swap-locations', { managerAId, managerBId }),
  listLocations: () => api.get('/api/users/locations'),
  assignLocation: (managerId, locationName, locationId) =>
    api.post('/api/users/assign-location', { managerId, locationName, locationId }),
  deleteManager: (id) => api.delete(`/api/users/${id}`),
}

// ── Locations ────────────────────────────────────────────────────────────────
export const locationsApi = {
  list: () => api.get('/api/locations'),
  create: (data) => api.post('/api/locations', data),
  update: (id, data) => api.patch(`/api/locations/${id}`, data),
  remove: (id) => api.delete(`/api/locations/${id}`),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => api.get('/api/dashboard/stats'),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => api.get('/api/notifications'),
  markAllRead: () => api.patch('/api/notifications/read-all'),
  markOneRead: (id) => api.patch(`/api/notifications/${id}/read`),
}

export default api
