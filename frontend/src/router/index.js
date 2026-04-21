import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'candidates',
        name: 'Candidates',
        component: () => import('@/views/CandidatesView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'candidates/:id',
        name: 'CandidateDetail',
        component: () => import('@/views/CandidateDetailView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'appointments',
        name: 'Appointments',
        component: () => import('@/views/AppointmentsView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'availability',
        name: 'Availability',
        component: () => import('@/views/AvailabilityView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/UsersView.vue'),
        meta: { requiresAuth: true, requiresAdminOrHR: true }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  if (to.meta.public) {
    if (auth.isAuthenticated && to.name === 'Login') return next('/dashboard')
    return next()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next('/login')
  }

  if (to.meta.requiresAdminOrHR && !auth.isAdmin && auth.user?.role !== 'HR') {
    return next('/dashboard')
  }

  next()
})

export default router
