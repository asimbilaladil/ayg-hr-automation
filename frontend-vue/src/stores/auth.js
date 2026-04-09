import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('hr_user') || 'null'))
  const token = ref(localStorage.getItem('hr_token') || null)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isManager = computed(() => ['ADMIN', 'MANAGER'].includes(user.value?.role))
  const isHR = computed(() => ['ADMIN', 'MANAGER', 'HR'].includes(user.value?.role))

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const { data } = await authApi.login(email, password)
      token.value = data.token
      user.value = data.user
      localStorage.setItem('hr_token', data.token)
      localStorage.setItem('hr_user', JSON.stringify(data.user))
      return true
    } catch (err) {
      error.value = err.response?.data?.error || 'Login failed. Please try again.'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('hr_token')
    localStorage.removeItem('hr_user')
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const { data } = await authApi.me()
      user.value = data
      localStorage.setItem('hr_user', JSON.stringify(data))
    } catch {
      logout()
    }
  }

  return { user, token, loading, error, isAuthenticated, isAdmin, isManager, isHR, login, logout, fetchMe }
})
