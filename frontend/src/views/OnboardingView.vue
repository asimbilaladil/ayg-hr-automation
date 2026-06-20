<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-xl font-bold text-gray-900">Onboarding — 30 Days</h2>
        <p class="text-sm text-gray-500 mt-0.5">
          Employees who just completed their first 30 days — call each one to check in on their experience
        </p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Filter tabs -->
        <div class="flex bg-gray-100 rounded-lg p-1 text-xs font-medium gap-1">
          <button
            v-for="f in filters"
            :key="f.value"
            class="px-3 py-1.5 rounded-md transition-colors"
            :class="activeFilter === f.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'"
            @click="activeFilter = f.value"
          >{{ f.label }}</button>
        </div>
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-3 gap-3">
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-gray-900">{{ employees.length }}</p>
        <p class="text-xs text-gray-500 mt-0.5">Total</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-green-600">{{ calledCount }}</p>
        <p class="text-xs text-gray-500 mt-0.5">Called</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-amber-500">{{ pendingCount }}</p>
        <p class="text-xs text-gray-500 mt-0.5">Pending</p>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Employee</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Manager</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Start Date</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th class="px-4 py-3 font-semibold text-gray-600 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <!-- Loading skeleton -->
            <tr v-if="loading" v-for="i in 4" :key="i">
              <td colspan="7" class="px-4 py-3">
                <div class="animate-pulse h-4 bg-gray-100 rounded w-3/4" />
              </td>
            </tr>

            <!-- Empty -->
            <tr v-else-if="!filtered.length">
              <td colspan="7" class="px-4 py-12 text-center text-gray-400">
                <div class="flex flex-col items-center gap-2">
                  <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span class="text-sm">
                    {{ activeFilter === 'pending' ? 'No pending employees — all called!' : 'No employees found' }}
                  </span>
                </div>
              </td>
            </tr>

            <!-- Rows -->
            <tr
              v-else
              v-for="emp in filtered"
              :key="emp.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <!-- Name -->
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ emp.firstName }} {{ emp.lastName }}</div>
                <div class="text-xs text-gray-400 mt-0.5">ID {{ emp.revelId }}</div>
              </td>

              <!-- Contact -->
              <td class="px-4 py-3 text-gray-600">
                <div v-if="emp.phone" class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  <a :href="`tel:${emp.phone}`" class="hover:text-brand-600 transition-colors">{{ emp.phone }}</a>
                </div>
                <div v-if="emp.email" class="flex items-center gap-1.5 mt-0.5">
                  <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <a :href="`mailto:${emp.email}`" class="hover:text-brand-600 transition-colors text-xs truncate max-w-[160px]">{{ emp.email }}</a>
                </div>
                <span v-if="!emp.phone && !emp.email" class="text-xs text-gray-300">—</span>
              </td>

              <!-- Location -->
              <td class="px-4 py-3 text-gray-600">
                <span v-if="emp.location">{{ emp.location.name }}</span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>

              <!-- Manager -->
              <td class="px-4 py-3 text-gray-600">
                <span v-if="emp.manager">{{ emp.manager.name }}</span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>

              <!-- Start Date -->
              <td class="px-4 py-3 text-gray-600">
                <span v-if="emp.employeeStart">{{ formatDate(emp.employeeStart) }}</span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>

              <!-- Status badge -->
              <td class="px-4 py-3">
                <div class="flex flex-col gap-1">
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit"
                    :class="emp.called
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full"
                      :class="emp.called ? 'bg-green-500' : 'bg-amber-500'" />
                    {{ emp.called ? 'Called' : 'Pending' }}
                  </span>
                  <span v-if="emp.calledAt" class="text-xs text-gray-400">
                    {{ formatDate(emp.calledAt) }}
                  </span>
                </div>
              </td>

              <!-- Action -->
              <td class="px-4 py-3 text-center">
                <button
                  class="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                  :class="emp.called
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-brand-600 text-white hover:bg-brand-700'"
                  :disabled="toggling === emp.id"
                  @click="toggleCalled(emp)"
                >
                  {{ toggling === emp.id ? '...' : emp.called ? 'Mark Pending' : 'Mark Called' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onboardingApi } from '@/api'

const employees = ref([])
const loading   = ref(false)
const toggling  = ref(null)
const activeFilter = ref('all')

const filters = [
  { label: 'All',     value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Called',  value: 'called' },
]

const filtered = computed(() => {
  if (activeFilter.value === 'pending') return employees.value.filter(e => !e.called)
  if (activeFilter.value === 'called')  return employees.value.filter(e => e.called)
  return employees.value
})

const calledCount  = computed(() => employees.value.filter(e => e.called).length)
const pendingCount = computed(() => employees.value.filter(e => !e.called).length)

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function load() {
  loading.value = true
  try {
    const { data } = await onboardingApi.list()
    employees.value = data.employees
  } finally {
    loading.value = false
  }
}

async function toggleCalled(emp) {
  toggling.value = emp.id
  try {
    const { data } = await onboardingApi.markCalled(emp.id, !emp.called)
    const idx = employees.value.findIndex(e => e.id === emp.id)
    if (idx !== -1) employees.value[idx] = data
  } finally {
    toggling.value = null
  }
}

onMounted(load)
</script>
