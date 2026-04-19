<template>
  <div class="space-y-4">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-gray-900">Appointments</h2>
      <p class="text-sm text-gray-500 mt-0.5">{{ total }} total appointments</p>
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
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Candidate</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Job Role</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Manager</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th v-if="auth.isManager" class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading" v-for="i in 6" :key="i">
              <td colspan="8" class="px-4 py-3">
                <div class="animate-pulse h-4 bg-gray-100 rounded" />
              </td>
            </tr>
            <tr v-else-if="!appointments.length">
              <td colspan="8" class="px-4 py-12 text-center text-gray-400">
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
            >
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
              <td v-if="auth.isManager" class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button
                    class="text-xs text-gray-500 hover:text-brand-600 border border-gray-200 hover:border-brand-300 px-2 py-1 rounded transition-colors"
                    @click="openEdit(a)"
                  >
                    Edit
                  </button>
                  <button
                    class="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-2 py-1 rounded transition-colors"
                    @click="confirmDelete(a)"
                  >
                    Delete
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

    <!-- Delete confirm -->
    <ConfirmDialog
      v-model="deleteModal"
      title="Delete appointment?"
      message="This appointment will be permanently deleted."
      confirm-text="Delete"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { appointmentsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'

const auth = useAuthStore()
const loading = ref(false)
const appointments = ref([])
const total = ref(0)
const page = ref(1)
const limit = 20

const filters = reactive({ location: '', date: '', managerEmail: '' })

const totalPages = computed(() => Math.ceil(total.value / limit))

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

// Edit
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

// Delete
const deleteModal = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

function confirmDelete(a) {
  deleteTarget.value = a
  deleteModal.value = true
}

async function doDelete() {
  deleting.value = true
  try {
    await appointmentsApi.remove(deleteTarget.value.id)
    appointments.value = appointments.value.filter(a => a.id !== deleteTarget.value.id)
    total.value = Math.max(0, total.value - 1)
    deleteModal.value = false
  } catch (err) {
    console.error(err)
  } finally {
    deleting.value = false
  }
}

onMounted(fetchData)
</script>
