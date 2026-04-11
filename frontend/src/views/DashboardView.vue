<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Good {{ greeting }}, {{ firstName }}!</h2>
      <p class="text-gray-500 text-sm mt-1">Here's what's happening with your recruitment pipeline.</p>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="stat in stats" :key="stat.label" class="card p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-gray-500 font-medium">{{ stat.label }}</p>
            <p class="text-3xl font-bold text-gray-900 mt-1">
              <span v-if="loading" class="animate-pulse bg-gray-200 rounded w-12 h-8 inline-block" />
              <span v-else>{{ stat.value }}</span>
            </p>
          </div>
          <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', stat.iconBg]">
            <component :is="stat.icon" :class="['w-5 h-5', stat.iconColor]" />
          </div>
        </div>
        <p v-if="stat.sub" class="text-xs text-gray-400 mt-2">{{ stat.sub }}</p>
      </div>
    </div>

    <!-- Two column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Candidates -->
      <div class="card">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Recent Candidates</h3>
          <RouterLink to="/candidates" class="text-sm text-brand-600 hover:text-brand-700 font-medium">View all →</RouterLink>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-if="loading" v-for="i in 5" :key="i" class="px-5 py-3 animate-pulse">
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-1" />
            <div class="h-3 bg-gray-100 rounded w-1/2" />
          </div>
          <div
            v-else-if="recentCandidates.length"
            v-for="c in recentCandidates"
            :key="c.id"
            class="px-5 py-3 hover:bg-gray-50 transition-colors"
          >
            <RouterLink :to="`/candidates/${c.id}`" class="flex items-center justify-between group">
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">{{ c.candidateName }}</p>
                <p class="text-xs text-gray-500 truncate">{{ c.postingName }} · {{ c.location }}</p>
              </div>
              <StatusBadge :status="c.status" class="ml-3 flex-shrink-0" />
            </RouterLink>
          </div>
          <div v-else class="px-5 py-8 text-center text-sm text-gray-400">No candidates yet</div>
        </div>
      </div>

      <!-- Upcoming Appointments -->
      <div class="card">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Upcoming Appointments</h3>
          <RouterLink to="/appointments" class="text-sm text-brand-600 hover:text-brand-700 font-medium">View all →</RouterLink>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-if="loading" v-for="i in 5" :key="i" class="px-5 py-3 animate-pulse">
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-1" />
            <div class="h-3 bg-gray-100 rounded w-1/2" />
          </div>
          <div
            v-else-if="upcomingAppointments.length"
            v-for="a in upcomingAppointments"
            :key="a.id"
            class="px-5 py-3"
          >
            <div class="flex items-center justify-between">
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ a.candidateName }}</p>
                <p class="text-xs text-gray-500 truncate">{{ a.jobRole || a.location }} · {{ a.startTime }}–{{ a.endTime }}</p>
              </div>
              <div class="ml-3 flex-shrink-0 text-right">
                <p class="text-xs font-medium text-gray-700">{{ formatDate(a.interviewDate) }}</p>
                <p class="text-xs text-gray-400">{{ a.managerName || '—' }}</p>
              </div>
            </div>
          </div>
          <div v-else class="px-5 py-8 text-center text-sm text-gray-400">No upcoming appointments</div>
        </div>
      </div>
    </div>

    <!-- AI Score Breakdown -->
    <div class="card p-5">
      <h3 class="font-semibold text-gray-900 mb-4">AI Recommendation Breakdown</h3>
      <div class="grid grid-cols-3 gap-4">
        <div v-for="rec in aiBreakdown" :key="rec.label" class="text-center">
          <div :class="['text-3xl font-bold', rec.color]">
            <span v-if="loading" class="animate-pulse">…</span>
            <span v-else>{{ rec.value }}</span>
          </div>
          <p class="text-sm text-gray-500 mt-1">{{ rec.label }}</p>
          <div class="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              :class="['h-full rounded-full transition-all duration-700', rec.barColor]"
              :style="{ width: totalCandidates ? `${(rec.value / totalCandidates) * 100}%` : '0%' }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { candidatesApi, appointmentsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/shared/StatusBadge.vue'

const auth = useAuthStore()
const loading = ref(true)
const candidates = ref([])
const appointments = ref([])

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
})

const firstName = computed(() => auth.user?.name?.split(' ')[0] || 'there')

// Summary stats
const totalCandidates = computed(() => candidates.value.length)
const pendingCandidates = computed(() => candidates.value.filter(c => c.status === 'pending').length)
const reviewedCandidates = computed(() => candidates.value.filter(c => c.status === 'reviewed').length)
const totalAppointments = computed(() => appointments.value.length)

const recentCandidates = computed(() =>
  [...candidates.value]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)
)

const upcomingAppointments = computed(() =>
  [...appointments.value]
    .filter(a => new Date(a.interviewDate) >= new Date())
    .sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate))
    .slice(0, 6)
)

const aiBreakdown = computed(() => [
  {
    label: 'Hire',
    value: candidates.value.filter(c => c.aiRecommendation === 'HIRE').length,
    color: 'text-green-600',
    barColor: 'bg-green-500'
  },
  {
    label: 'Maybe',
    value: candidates.value.filter(c => c.aiRecommendation === 'MAYBE').length,
    color: 'text-yellow-600',
    barColor: 'bg-yellow-500'
  },
  {
    label: 'Reject',
    value: candidates.value.filter(c => c.aiRecommendation === 'REJECT').length,
    color: 'text-red-600',
    barColor: 'bg-red-500'
  }
])

// Icon helpers using render functions
const PeopleIcon = { render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' })
]) }
const ClockIcon = { render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
]) }
const CheckIcon = { render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' })
]) }
const CalIcon = { render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
]) }

const stats = computed(() => [
  { label: 'Total Candidates', value: totalCandidates.value, icon: PeopleIcon, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', sub: 'All time' },
  { label: 'Pending Review', value: pendingCandidates.value, icon: ClockIcon, iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600', sub: 'Awaiting AI analysis' },
  { label: 'Reviewed', value: reviewedCandidates.value, icon: CheckIcon, iconBg: 'bg-green-50', iconColor: 'text-green-600', sub: 'AI scored' },
  { label: 'Appointments', value: totalAppointments.value, icon: CalIcon, iconBg: 'bg-brand-50', iconColor: 'text-brand-600', sub: 'Scheduled' },
])

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  try {
    const [cRes, aRes] = await Promise.all([
      candidatesApi.list({ limit: 9999 }),
      appointmentsApi.list({ limit: 9999 }),
    ])
    candidates.value = cRes.data?.data || cRes.data || []
    appointments.value = aRes.data?.data || aRes.data || []
  } catch (err) {
    console.error('Dashboard load error:', err)
  } finally {
    loading.value = false
  }
})
</script>
