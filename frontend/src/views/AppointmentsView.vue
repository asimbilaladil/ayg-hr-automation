<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-gray-900">Appointments</h2>
        <p class="text-sm text-gray-500 mt-0.5">{{ total }} total appointments</p>
      </div>
      <button
        v-if="selectedIds.size > 0"
        class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        @click="openBulkCancel"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cancel Selected ({{ selectedIds.size }})
      </button>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <input v-model="filters.location" class="input" placeholder="Filter by location…" @input="onSearch" />
        </div>
        <div>
          <input v-model="filters.date" class="input" type="date" @change="fetchData" />
        </div>
        <div>
          <input v-model="filters.managerEmail" class="input" placeholder="Manager email…" @input="onSearch" />
        </div>
      </div>
      <button
        v-if="filters.location || filters.date || filters.managerEmail"
        class="text-sm text-brand-600 hover:text-brand-700 font-medium mt-3"
        @click="clearFilters"
      >
        Clear filters
      </button>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th v-if="hasCancelableRows" class="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  :checked="allCancelableSelected"
                  :indeterminate.prop="someSelected && !allCancelableSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Candidate</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Job Role</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Manager</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th v-if="hasAnyAction" class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading" v-for="i in 6" :key="i">
              <td :colspan="colSpan" class="px-4 py-3">
                <div class="animate-pulse h-4 bg-gray-100 rounded" />
              </td>
            </tr>
            <tr v-else-if="!appointments.length">
              <td :colspan="colSpan" class="px-4 py-12 text-center text-gray-400">
                <svg class="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                No appointments found
              </td>
            </tr>
            <tr
              v-else
              v-for="a in appointments"
              :key="a.id"
              class="hover:bg-gray-50 transition-colors"
              :class="{ 'bg-red-50': selectedIds.has(a.id) }"
            >
              <!-- Checkbox cell -->
              <td v-if="hasCancelableRows" class="px-4 py-3">
                <input
                  v-if="canCancel(a)"
                  type="checkbox"
                  class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  :checked="selectedIds.has(a.id)"
                  @change="toggleSelect(a.id)"
                />
              </td>

              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">{{ a.candidateName }}</p>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ a.jobRole || '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ a.location }}</td>
              <td class="px-4 py-3 text-gray-700 whitespace-nowrap">{{ formatDate(a.interviewDate) }}</td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ formatTime(a.startTime) }} – {{ formatTime(a.endTime) }}</td>
              <td class="px-4 py-3">
                <div>
                  <p class="text-sm text-gray-700">{{ a.managerName || '—' }}</p>
                  <p class="text-xs text-gray-400">{{ a.managerEmail || '' }}</p>
                </div>
              </td>
              <td class="px-4 py-3">
                <StatusBadge status="scheduled" />
              </td>
              <td v-if="hasAnyAction" class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button
                    v-if="canEdit(a)"
                    class="text-xs text-gray-500 hover:text-brand-600 border border-gray-200 hover:border-brand-300 px-2 py-1 rounded transition-colors"
                    @click="openEdit(a)"
                  >
                    Edit
                  </button>
                  <button
                    v-if="canCancel(a)"
                    class="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-2 py-1 rounded transition-colors"
                    @click="confirmCancel(a)"
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <p class="text-sm text-gray-500">Page {{ page }} of {{ totalPages }}</p>
        <div class="flex gap-2">
          <button class="btn-secondary btn-sm" :disabled="page <= 1" @click="page--; fetchData()">← Prev</button>
          <button class="btn-secondary btn-sm" :disabled="page >= totalPages" @click="page++; fetchData()">Next →</button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="editModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="editModal = false" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Edit Appointment</h3>
          <form @submit.prevent="saveEdit" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label">Candidate Name</label>
                <input :value="editForm.candidateName" class="input bg-gray-50 text-gray-500 cursor-not-allowed" disabled />
              </div>
              <div>
                <label class="label">Job Role</label>
                <input :value="editForm.jobRole" class="input bg-gray-50 text-gray-500 cursor-not-allowed" disabled />
              </div>
              <div>
                <label class="label">Location</label>
                <input :value="editForm.location" class="input bg-gray-50 text-gray-500 cursor-not-allowed" disabled />
              </div>
              <div>
                <label class="label">Interview Date</label>
                <input :value="editForm.interviewDate" class="input bg-gray-50 text-gray-500 cursor-not-allowed" type="date" disabled />
              </div>
              <div>
                <label class="label">Start Time</label>
                <input v-model="editForm.startTime" class="input" placeholder="09:00" />
              </div>
              <div>
                <label class="label">End Time</label>
                <input v-model="editForm.endTime" class="input" placeholder="09:20" />
              </div>
              <div class="col-span-2">
                <label class="label">Manager</label>
                <input :value="editForm.managerName" class="input bg-gray-50 text-gray-500 cursor-not-allowed" disabled />
              </div>
            </div>
            <div v-if="editError" class="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{{ editError }}</div>
            <div class="flex justify-end gap-3">
              <button type="button" class="btn-secondary" @click="editModal = false">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="saving">
                {{ saving ? 'Saving…' : 'Save changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Cancel modal (single + bulk) -->
    <Teleport to="body">
      <div v-if="cancelModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="cancelModal = false" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900">
                {{ cancelIsBulk ? `Cancel ${selectedIds.size} appointments?` : 'Cancel appointment?' }}
              </h3>
              <p class="text-sm text-gray-500 mt-0.5">
                {{ cancelIsBulk
                  ? `${selectedIds.size} candidate${selectedIds.size !== 1 ? 's' : ''} will be marked as cancelled.`
                  : `${cancelTarget?.candidateName || 'This candidate'} will be marked as cancelled.` }}
              </p>
            </div>
          </div>

          <div class="mb-5">
            <label class="label mb-1">
              Reason for cancellation <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="cancelReason"
              class="input resize-none"
              rows="3"
              placeholder="e.g. Manager unavailable on the scheduled date, please reschedule…"
              autofocus
            />
            <p class="text-xs text-gray-400 mt-1">The AI will use this reason when calling the candidate to reschedule.</p>
            <p v-if="cancelReasonError" class="text-xs text-red-600 mt-1">{{ cancelReasonError }}</p>
          </div>

          <div class="flex gap-3 justify-end">
            <button class="btn-secondary" @click="cancelModal = false" :disabled="cancelling || bulkCancelling">
              Close
            </button>
            <button
              class="btn-danger flex items-center gap-2"
              :disabled="cancelling || bulkCancelling"
              @click="cancelIsBulk ? doBulkCancel() : doCancel()"
            >
              <svg v-if="cancelling || bulkCancelling" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ cancelIsBulk ? `Cancel ${selectedIds.size} appointments` : 'Cancel appointment' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { appointmentsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/shared/StatusBadge.vue'

const auth = useAuthStore()
const loading = ref(false)
const appointments = ref([])
const total = ref(0)
const page = ref(1)
const limit = 20

const filters = reactive({ location: '', date: '', managerEmail: '' })

const totalPages = computed(() => Math.ceil(total.value / limit))

// ── Role helpers ───────────────────────────────────────────────────────────
function canCancel(a) {
  const role = auth.user?.role
  if (role === 'ADMIN' || role === 'HR') return true
  if (role === 'MANAGER') return a.managerId === auth.user?.id
  return false
}

function canEdit(a) {
  const role = auth.user?.role
  if (role === 'ADMIN') return true
  if (role === 'MANAGER') return a.managerId === auth.user?.id
  return false
}

const hasCancelableRows = computed(() => appointments.value.some(canCancel))
const hasAnyAction = computed(() => appointments.value.some(a => canCancel(a) || canEdit(a)))

// ── Column span ────────────────────────────────────────────────────────────
const colSpan = computed(() => {
  let cols = 8 // base columns
  if (hasCancelableRows.value) cols++
  if (hasAnyAction.value) cols++
  return cols
})

// ── Filters & fetch ────────────────────────────────────────────────────────
let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchData() }, 400)
}

function clearFilters() {
  filters.location = ''
  filters.date = ''
  filters.managerEmail = ''
  page.value = 1
  fetchData()
}

function normalizeAppointment(a) {
  return {
    ...a,
    candidateName: a.candidate_rel?.name || '—',
    jobRole:       a.candidate_rel?.posting_rel?.name || '—',
    location:      a.location_rel?.name || '—',
    managerName:   a.manager_rel?.name || '—',
    managerEmail:  a.manager_rel?.email || '',
  }
}

async function fetchData() {
  loading.value = true
  selectedIds.value = new Set()
  try {
    const params = { page: page.value, limit }
    if (filters.location) params.location = filters.location
    if (filters.date) params.date = filters.date
    if (filters.managerEmail) params.managerEmail = filters.managerEmail
    const { data } = await appointmentsApi.list(params)
    const raw = data?.data || data || []
    appointments.value = raw.map(normalizeAppointment)
    total.value = data?.total ?? appointments.value.length
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(t) {
  if (!t) return '—'
  const [hStr, mStr] = t.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr || '00'
  const period = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${period}`
}

// ── Checkbox selection ─────────────────────────────────────────────────────
const selectedIds = ref(new Set())

const cancelableIds = computed(() => appointments.value.filter(canCancel).map(a => a.id))
const allCancelableSelected = computed(() =>
  cancelableIds.value.length > 0 && cancelableIds.value.every(id => selectedIds.value.has(id))
)
const someSelected = computed(() => selectedIds.value.size > 0)

function toggleSelect(id) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = s
}

function toggleSelectAll() {
  if (allCancelableSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(cancelableIds.value)
  }
}

// ── Edit ──────────────────────────────────────────────────────────────────
const editModal = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const editError = ref('')
const editForm = reactive({
  candidateName: '', jobRole: '', location: '',
  interviewDate: '', startTime: '', endTime: '',
  managerName: ''
})

function openEdit(a) {
  editTarget.value = a
  Object.assign(editForm, {
    candidateName: a.candidateName || '',
    jobRole: a.jobRole || '',
    location: a.location || '',
    interviewDate: a.interviewDate ? a.interviewDate.split('T')[0] : '',
    startTime: a.startTime || '',
    endTime: a.endTime || '',
    managerName: a.managerName || '',
  })
  editModal.value = true
}

async function saveEdit() {
  saving.value = true
  editError.value = ''
  try {
    const { data } = await appointmentsApi.update(editTarget.value.id, editForm)
    const idx = appointments.value.findIndex(a => a.id === editTarget.value.id)
    if (idx !== -1) appointments.value[idx] = normalizeAppointment(data)
    editModal.value = false
  } catch (err) {
    editError.value = err.response?.data?.error || 'Failed to save'
  } finally {
    saving.value = false
  }
}

// ── Cancel (single + bulk share one modal) ────────────────────────────────
const cancelModal = ref(false)
const cancelIsBulk = ref(false)
const cancelTarget = ref(null)
const cancelReason = ref('')
const cancelReasonError = ref('')
const cancelling = ref(false)
const bulkCancelling = ref(false)

function confirmCancel(a) {
  cancelTarget.value = a
  cancelIsBulk.value = false
  cancelReason.value = ''
  cancelReasonError.value = ''
  cancelModal.value = true
}

function openBulkCancel() {
  cancelIsBulk.value = true
  cancelReason.value = ''
  cancelReasonError.value = ''
  cancelModal.value = true
}

async function doCancel() {
  if (!cancelReason.value.trim()) {
    cancelReasonError.value = 'Please enter a reason for cancellation.'
    return
  }
  cancelling.value = true
  try {
    await appointmentsApi.cancel(cancelTarget.value.id, cancelReason.value.trim())
    appointments.value = appointments.value.filter(a => a.id !== cancelTarget.value.id)
    const s = new Set(selectedIds.value)
    s.delete(cancelTarget.value.id)
    selectedIds.value = s
    total.value = Math.max(0, total.value - 1)
    cancelModal.value = false
  } catch (err) {
    console.error(err)
  } finally {
    cancelling.value = false
  }
}

async function doBulkCancel() {
  if (!cancelReason.value.trim()) {
    cancelReasonError.value = 'Please enter a reason for cancellation.'
    return
  }
  bulkCancelling.value = true
  try {
    const ids = [...selectedIds.value]
    await appointmentsApi.bulkCancel(ids, cancelReason.value.trim())
    appointments.value = appointments.value.filter(a => !selectedIds.value.has(a.id))
    total.value = Math.max(0, total.value - ids.length)
    selectedIds.value = new Set()
    cancelModal.value = false
  } catch (err) {
    console.error(err)
  } finally {
    bulkCancelling.value = false
  }
}

onMounted(fetchData)
</script>
