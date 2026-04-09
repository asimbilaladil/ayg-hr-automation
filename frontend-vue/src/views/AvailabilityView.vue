<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold text-gray-900">Availability</h2>
        <p class="text-sm text-gray-500 mt-0.5">Manager interview availability slots</p>
      </div>
      <button v-if="auth.isManager" class="btn-primary" @click="openCreate">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Slot
      </button>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input v-model="filters.location" class="input" placeholder="Filter by location…" @input="onSearch" />
        <select v-model="filters.dayOfWeek" class="input" @change="fetchData">
          <option value="">All days</option>
          <option v-for="d in DAYS" :key="d" :value="d">{{ d }}</option>
        </select>
        <select v-model="filters.active" class="input" @change="fetchData">
          <option value="">All</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Manager</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Day</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Slot Duration</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th v-if="auth.isManager" class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading" v-for="i in 5" :key="i">
              <td colspan="7" class="px-4 py-3">
                <div class="animate-pulse h-4 bg-gray-100 rounded" />
              </td>
            </tr>
            <tr v-else-if="!slots.length">
              <td colspan="7" class="px-4 py-12 text-center text-gray-400">
                <svg class="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                No availability slots found
              </td>
            </tr>
            <tr
              v-else
              v-for="s in slots"
              :key="s.id"
              class="hover:bg-gray-50 transition-colors"
              :class="{ 'opacity-50': !s.active }"
            >
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">{{ s.managerName }}</p>
                <p class="text-xs text-gray-400">{{ s.managerEmail }}</p>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ s.location }}</td>
              <td class="px-4 py-3 text-gray-700 font-medium">{{ s.dayOfWeek }}</td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ s.startTime }} – {{ s.endTime }}</td>
              <td class="px-4 py-3 text-gray-600">{{ s.slotDuration }}</td>
              <td class="px-4 py-3">
                <StatusBadge :status="s.active ? 'active' : 'inactive'" />
              </td>
              <td v-if="auth.isManager" class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button
                    class="text-xs text-gray-500 hover:text-brand-600 border border-gray-200 hover:border-brand-300 px-2 py-1 rounded transition-colors"
                    @click="openEdit(s)"
                  >Edit</button>
                  <button
                    class="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-2 py-1 rounded transition-colors"
                    @click="confirmDelete(s)"
                  >Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="modal = false" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            {{ modalMode === 'create' ? 'Add Availability Slot' : 'Edit Slot' }}
          </h3>
          <form @submit.prevent="saveModal" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label">Manager Name</label>
                <input v-model="form.managerName" class="input" required />
              </div>
              <div>
                <label class="label">Manager Email</label>
                <input v-model="form.managerEmail" class="input" type="email" required />
              </div>
              <div>
                <label class="label">Location</label>
                <input v-model="form.location" class="input" required />
              </div>
              <div>
                <label class="label">Day of Week</label>
                <select v-model="form.dayOfWeek" class="input" required>
                  <option value="">Select day…</option>
                  <option v-for="d in DAYS" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
              <div>
                <label class="label">Start Time</label>
                <input v-model="form.startTime" class="input" placeholder="09:00" required />
              </div>
              <div>
                <label class="label">End Time</label>
                <input v-model="form.endTime" class="input" placeholder="17:00" required />
              </div>
              <div>
                <label class="label">Slot Duration</label>
                <select v-model="form.slotDuration" class="input">
                  <option value="15 Min">15 Min</option>
                  <option value="20 Min">20 Min</option>
                  <option value="30 Min">30 Min</option>
                  <option value="45 Min">45 Min</option>
                  <option value="60 Min">60 Min</option>
                </select>
              </div>
              <div>
                <label class="label">Active</label>
                <select v-model="form.active" class="input">
                  <option :value="true">Active</option>
                  <option :value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div v-if="formError" class="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{{ formError }}</div>

            <div class="flex justify-end gap-3">
              <button type="button" class="btn-secondary" @click="modal = false">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="saving">
                <svg v-if="saving" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ saving ? 'Saving…' : (modalMode === 'create' ? 'Add Slot' : 'Save Changes') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirm -->
    <ConfirmDialog
      v-model="deleteModal"
      title="Delete slot?"
      message="This availability slot will be permanently deleted."
      confirm-text="Delete"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { availabilityApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'

const auth = useAuthStore()
const loading = ref(false)
const slots = ref([])

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const filters = reactive({ location: '', dayOfWeek: '', active: '' })

let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchData, 400)
}

async function fetchData() {
  loading.value = true
  try {
    const params = {}
    if (filters.location) params.location = filters.location
    if (filters.dayOfWeek) params.dayOfWeek = filters.dayOfWeek
    if (filters.active !== '') params.active = filters.active
    const { data } = await availabilityApi.list(params)
    slots.value = data?.data || data || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

// Modal
const modal = ref(false)
const modalMode = ref('create')
const editTarget = ref(null)
const saving = ref(false)
const formError = ref('')

const form = reactive({
  managerName: '', managerEmail: '', location: '',
  dayOfWeek: '', startTime: '', endTime: '',
  slotDuration: '20 Min', active: true
})

function resetForm() {
  Object.assign(form, { managerName: '', managerEmail: '', location: '', dayOfWeek: '', startTime: '', endTime: '', slotDuration: '20 Min', active: true })
}

function openCreate() {
  resetForm()
  modalMode.value = 'create'
  formError.value = ''
  modal.value = true
}

function openEdit(s) {
  editTarget.value = s
  Object.assign(form, {
    managerName: s.managerName || '',
    managerEmail: s.managerEmail || '',
    location: s.location || '',
    dayOfWeek: s.dayOfWeek || '',
    startTime: s.startTime || '',
    endTime: s.endTime || '',
    slotDuration: s.slotDuration || '20 Min',
    active: s.active !== false,
  })
  modalMode.value = 'edit'
  formError.value = ''
  modal.value = true
}

async function saveModal() {
  saving.value = true
  formError.value = ''
  try {
    if (modalMode.value === 'create') {
      const { data } = await availabilityApi.create(form)
      slots.value.unshift(data)
    } else {
      const { data } = await availabilityApi.update(editTarget.value.id, form)
      const idx = slots.value.findIndex(s => s.id === editTarget.value.id)
      if (idx !== -1) slots.value[idx] = data
    }
    modal.value = false
  } catch (err) {
    formError.value = err.response?.data?.error || 'Failed to save'
  } finally {
    saving.value = false
  }
}

// Delete
const deleteModal = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

function confirmDelete(s) {
  deleteTarget.value = s
  deleteModal.value = true
}

async function doDelete() {
  deleting.value = true
  try {
    await availabilityApi.remove(deleteTarget.value.id)
    slots.value = slots.value.filter(s => s.id !== deleteTarget.value.id)
    deleteModal.value = false
  } catch (err) {
    console.error(err)
  } finally {
    deleting.value = false
  }
}

onMounted(fetchData)
</script>
