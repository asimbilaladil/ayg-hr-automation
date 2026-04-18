<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold text-gray-900">Candidates</h2>
        <p class="text-sm text-gray-500 mt-0.5">{{ total }} total candidates</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <input
            v-model="filters.search"
            class="input"
            placeholder="Search name, phone…"
            @input="onSearch"
          />
        </div>
        <div>
          <select v-model="filters.status" class="input" @change="fetchData">
            <option value="">All statuses</option>
            <option v-for="s in STATUSES" :key="s" :value="s">{{ capitalize(s) }}</option>
          </select>
        </div>
        <div>
          <select v-model="filters.aiRecommendation" class="input" @change="fetchData">
            <option value="">All AI recs</option>
            <option value="HIRE">Hire</option>
            <option value="MAYBE">Maybe</option>
            <option value="REJECT">Reject</option>
          </select>
        </div>
        <div>
          <input
            v-model="filters.location"
            class="input"
            placeholder="Filter by location…"
            @input="onSearch"
          />
        </div>
        <div>
          <input
            v-model="filters.hiringManager"
            class="input"
            placeholder="Filter by hiring manager…"
            @input="onSearch"
          />
        </div>
      </div>
      <div class="flex items-center justify-between mt-3">
        <button
          v-if="hasActiveFilters"
          class="text-sm text-brand-600 hover:text-brand-700 font-medium"
          @click="clearFilters"
        >
          Clear filters
        </button>
        <div class="flex items-center gap-2 ml-auto">
          <span class="text-sm text-gray-500">Sort by:</span>
          <select v-model="filters.sortBy" class="input text-sm w-auto" @change="fetchData">
            <option value="createdAt">Date added</option>
            <option value="aiScore">AI Score</option>
            <option value="candidateName">Name</option>
          </select>
          <select v-model="filters.sortOrder" class="input text-sm w-auto" @change="fetchData">
            <option value="desc">↓ Desc</option>
            <option value="asc">↑ Asc</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Candidate</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Position</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Location</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Hiring Manager</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Status</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">AI Score</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">AI Rec</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Resume</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Date</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <!-- Loading -->
            <tr v-if="loading" v-for="i in 8" :key="i">
              <td colspan="8" class="px-4 py-3">
                <div class="animate-pulse h-4 bg-gray-100 rounded w-full" />
              </td>
            </tr>
            <!-- Empty -->
            <tr v-else-if="!candidates.length">
              <td colspan="8" class="px-4 py-12 text-center text-gray-400">
                <svg class="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                No candidates found
              </td>
            </tr>
            <!-- Data -->
            <tr
              v-else
              v-for="c in candidates"
              :key="c.id"
              class="hover:bg-gray-50 cursor-pointer transition-colors"
              @click="openDrawer(c)"
            >
              <td class="px-4 py-3">
                <div>
                  <p class="font-medium text-gray-900">{{ c.candidateName }}</p>
                  <p class="text-xs text-gray-400">{{ c.phone || '—' }}</p>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-700 max-w-[180px] truncate">{{ c.postingName }}</td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ c.location }}</td>
              <td class="px-4 py-3 text-gray-600 text-sm">{{ c.hiringManager || '—' }}</td>
              <td class="px-4 py-3 first-letter:uppercase"><StatusBadge :status="c.status" /></td>
              <td class="px-4 py-3">
                <div v-if="c.aiScore != null" class="flex items-center gap-2">
                  <div class="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      :class="['h-full rounded-full', scoreBarColor(c.aiScore)]"
                      :style="{ width: `${c.aiScore}%` }"
                    />
                  </div>
                  <span class="text-sm font-medium text-gray-700">{{ c.aiScore }}%</span>
                </div>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-3"><StatusBadge v-if="c.aiRecommendation" :status="c.aiRecommendation" /></td>
              <td class="px-4 py-3">
                <button
                  v-if="c.emailId"
                  class="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  :disabled="resumeLoadingId === c.id"
                  @click="viewResume(c, $event)"
                >
                  <svg v-if="resumeLoadingId === c.id" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {{ resumeLoadingId === c.id ? '…' : 'View' }}
                </button>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>
              <td class="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{{ formatDate(c.createdAt) }}</td>
              <td class="px-4 py-3">
                <button
                  class="text-gray-400 hover:text-brand-600 transition-colors"
                  @click.stop="openDrawer(c)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <p class="text-sm text-gray-500">
          Page {{ page }} of {{ totalPages }} · {{ total }} results
        </p>
        <div class="flex gap-2">
          <button
            class="btn-secondary btn-sm"
            :disabled="page <= 1"
            @click="page--; fetchData()"
          >← Prev</button>
          <button
            class="btn-secondary btn-sm"
            :disabled="page >= totalPages"
            @click="page++; fetchData()"
          >Next →</button>
        </div>
      </div>
    </div>

    <!-- Candidate Drawer -->
    <CandidateDrawer
      v-if="selectedCandidate"
      v-model="drawerOpen"
      :candidate="selectedCandidate"
      :is-admin="auth.isAdmin"
      @updated="onCandidateUpdated"
      @deleted="onCandidateDeleted"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { candidatesApi } from '@/api'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import CandidateDrawer from '@/components/candidates/CandidateDrawer.vue'

const auth = useAuthStore()
const loading = ref(false)
const candidates = ref([])
const total = ref(0)
const page = ref(1)
const limit = 20

const STATUSES = ['pending', 'reviewing', 'reviewed', 'called', 'scheduled', 'rejected', 'hired']

const filters = reactive({
  search: '',
  status: '',
  aiRecommendation: '',
  location: '',
  hiringManager: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
})

const totalPages = computed(() => Math.ceil(total.value / limit))
const hasActiveFilters = computed(() =>
  filters.search || filters.status || filters.aiRecommendation || filters.location || filters.hiringManager
)

// Drawer
const drawerOpen = ref(false)
const selectedCandidate = ref(null)

function openDrawer(c) {
  selectedCandidate.value = c
  drawerOpen.value = true
}

let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchData() }, 400)
}

function clearFilters() {
  filters.search = ''
  filters.status = ''
  filters.aiRecommendation = ''
  filters.location = ''
  filters.hiringManager = ''
  page.value = 1
  fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    const params = { page: page.value, limit }
    if (filters.search) params.search = filters.search
    if (filters.status) params.status = filters.status
    if (filters.aiRecommendation) params.aiRecommendation = filters.aiRecommendation
    if (filters.location) params.location = filters.location
    if (filters.hiringManager) params.hiringManager = filters.hiringManager
    params.sortBy = filters.sortBy
    params.sortOrder = filters.sortOrder

    const { data } = await candidatesApi.list(params)
    candidates.value = data?.data || data || []
    total.value = data?.total ?? candidates.value.length
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function onCandidateUpdated(updated) {
  const idx = candidates.value.findIndex(c => c.id === updated.id)
  if (idx !== -1) candidates.value[idx] = updated
  selectedCandidate.value = updated
}

function onCandidateDeleted(id) {
  candidates.value = candidates.value.filter(c => c.id !== id)
  drawerOpen.value = false
  selectedCandidate.value = null
  total.value = Math.max(0, total.value - 1)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

function scoreBarColor(score) {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-400'
}

const resumeLoadingId = ref(null)

async function viewResume(candidate, event) {
  event.stopPropagation()
  if (!candidate?.emailId) return
  resumeLoadingId.value = candidate.id
  try {
    const res = await api.get(`/api/candidates/resume/${candidate.emailId}`, {
      responseType: 'blob',
    })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  } catch (err) {
    console.error('Failed to load resume:', err)
    alert('Resume not found or could not be loaded.')
  } finally {
    resumeLoadingId.value = null
  }
}

onMounted(fetchData)
</script>
