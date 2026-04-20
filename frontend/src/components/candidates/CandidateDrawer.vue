<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
      @click="close"
    />

    <!-- Drawer panel -->
    <div
      :class="[
        'fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out',
        modelValue ? 'translate-x-0' : 'translate-x-full'
      ]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
            <span class="text-brand-700 font-semibold text-sm">{{ initials }}</span>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{{ candidate?.candidateName }}</h2>
            <p class="text-xs text-gray-500">{{ candidate?.postingName }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <RouterLink
            :to="`/candidates/${candidate?.id}`"
            class="btn-secondary btn-sm"
            @click="close"
          >
            Full view
          </RouterLink>
          <button class="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" @click="close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- Tabs -->
        <div class="flex border-b border-gray-200 px-6">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="[
              'py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            ]"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="p-6 space-y-6">
          <!-- Status + AI Score row -->
          <div class="flex flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500">Status:</span>
              <StatusBadge :status="candidate?.status" />
            </div>
            <div v-if="candidate?.aiScore != null" class="flex items-center gap-2">
              <span class="text-sm text-gray-500">AI Score:</span>
              <span :class="['text-sm font-bold', scoreColor(candidate.aiScore)]">{{ candidate.aiScore }}%</span>
            </div>
            <div v-if="candidate?.aiRecommendation" class="flex items-center gap-2">
              <span class="text-sm text-gray-500">AI Rec:</span>
              <StatusBadge :status="candidate.aiRecommendation" />
            </div>
          </div>

          <!-- Details grid -->
          <div class="grid grid-cols-2 gap-4">
            <InfoField label="Position" :value="candidate?.postingName" />
            <InfoField label="Location" :value="candidate?.location" />
            <InfoField label="Phone" :value="candidate?.phone" />
            <InfoField label="Email" :value="candidate?.emailId" />
            <InfoField label="Hiring Manager" :value="candidate?.hiringManager" />
            <InfoField label="Recruiter" :value="candidate?.recruiter" />
            <InfoField label="Date Applied" :value="candidate?.dateApplied" />
            <InfoField label="Date Added" :value="formatDate(candidate?.createdAt)" />
          </div>

          <!-- Appointment info -->
          <div v-if="candidate?.appointment" class="border-t border-gray-200 pt-4 mt-4">
            <h4 class="text-sm font-semibold text-gray-700 mb-3">Scheduled Appointment</h4>
            <div class="grid grid-cols-2 gap-4 bg-blue-50 rounded-lg p-4">
              <InfoField label="Interview Date" :value="formatDate(candidate.appointment.interviewDate)" />
              <InfoField label="Location" :value="candidate.appointment.location_rel?.name" />
              <InfoField label="Start Time" :value="candidate.appointment.startTime" />
              <InfoField label="End Time" :value="candidate.appointment.endTime || '—'" />
            </div>
          </div>

          <!-- AI Summary -->
          <div v-if="candidate?.aiSummary">
            <h4 class="text-sm font-semibold text-gray-700 mb-2">AI Summary</h4>
            <div class="bg-blue-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
              {{ candidate.aiSummary }}
            </div>
          </div>

          <!-- AI Criteria -->
          <div v-if="candidate?.aiCriteriaMet || candidate?.aiCriteriaMissing" class="grid grid-cols-2 gap-4">
            <div v-if="candidate?.aiCriteriaMet">
              <h4 class="text-sm font-semibold text-green-700 mb-2">✓ Criteria Met</h4>
              <div class="bg-green-50 rounded-lg p-3 text-xs text-green-800 leading-relaxed">
                {{ candidate.aiCriteriaMet }}
              </div>
            </div>
            <div v-if="candidate?.aiCriteriaMissing">
              <h4 class="text-sm font-semibold text-red-700 mb-2">✗ Criteria Missing</h4>
              <div class="bg-red-50 rounded-lg p-3 text-xs text-red-800 leading-relaxed">
                {{ candidate.aiCriteriaMissing }}
              </div>
            </div>
          </div>

          <!-- Resume -->
          <div v-if="hasResume" class="border-t border-gray-200 pt-4">
            <h4 class="text-sm font-semibold text-gray-700 mb-3">Resume</h4>
            <button
              class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-lg transition-colors disabled:opacity-50"
              :disabled="resumeLoading"
              @click="viewResume"
            >
              <svg v-if="resumeLoading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {{ resumeLoading ? 'Loading…' : 'View Resume' }}
            </button>
            <p v-if="resumeError" class="mt-2 text-xs text-red-500">{{ resumeError }}</p>
          </div>
        </div>

        <!-- Edit Tab -->
        <div v-if="activeTab === 'edit'" class="p-6">
          <form @submit.prevent="saveEdit" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="label">Candidate Name</label>
                <input v-model="editForm.candidateName" class="input" />
              </div>
              <div>
                <label class="label">Email</label>
                <input v-model="editForm.emailId" class="input" type="email" disabled />
              </div>
              <div>
                <label class="label">Phone</label>
                <input v-model="editForm.phone" class="input" placeholder="(555) 555-5555" />
              </div>
              <div>
                <label class="label">Posting Name</label>
                <select v-model="editForm.postingName" class="input">
                  <option value="">Select posting…</option>
                  <option v-for="p in postings" :key="p.id" :value="p.name">{{ p.name }}</option>
                </select>
              </div>
              <div>
                <label class="label">Location</label>
                <select v-model="editForm.location" class="input" disabled>
                  <option v-for="loc in selectedManagerLocations" :key="loc.id" :value="loc.name">{{ loc.name }}</option>
                </select>
                <p class="text-xs text-gray-400 mt-1">Location is based on manager assignment</p>
              </div>
              <div>
                <label class="label">Hiring Manager</label>
                <select v-model="editForm.hiringManager" class="input" @change="onManagerChange">
                  <option value="">Select manager…</option>
                  <option v-for="m in managers" :key="m.id" :value="m.name">{{ m.name }}</option>
                </select>
              </div>
              <div>
                <label class="label">Date Applied</label>
                <input v-model="editForm.dateApplied" class="input" type="date" />
              </div>
              <div>
                <label class="label">Status</label>
                <select v-model="editForm.status" class="input">
                  <option value="">Select status…</option>
                  <option v-for="s in STATUSES" :key="s" :value="s">{{ capitalize(s) }}</option>
                </select>
              </div>
            </div>

            <div v-if="editError" class="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
              {{ editError }}
            </div>
            <div v-if="editSuccess" class="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700">
              Changes saved successfully!
            </div>

            <div class="flex gap-3">
              <button type="submit" class="btn-primary" :disabled="saving">
                <svg v-if="saving" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ saving ? 'Saving…' : 'Save changes' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Transcript Tab -->
        <div v-if="activeTab === 'transcript'" class="flex flex-col h-full">
          <!-- Audio Player -->
          <div v-if="candidate?.recordingUrl" class="mx-6 mt-5 mb-1 bg-gradient-to-r from-brand-50 to-blue-50 border border-brand-200 rounded-xl p-4">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-800">Call Recording</p>
                <p class="text-xs text-gray-500">AI screening call</p>
              </div>
              <a :href="candidate.recordingUrl" target="_blank" rel="noopener noreferrer"
                class="ml-auto p-1.5 rounded-lg hover:bg-brand-100 text-brand-500 hover:text-brand-700 transition-colors"
                title="Download recording">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            </div>
            <audio :src="candidate.recordingUrl" controls class="w-full h-9" style="outline:none;" />
          </div>

          <!-- Chat transcript -->
          <div v-if="candidate?.transcript" class="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            <template v-for="(msg, i) in parsedTranscript" :key="i">
              <!-- AI message -->
              <div v-if="msg.role === 'ai'" class="flex items-start gap-2.5">
                <div class="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                </div>
                <div class="max-w-[78%]">
                  <p class="text-[10px] font-semibold text-brand-600 mb-1 ml-1">AI Assistant</p>
                  <div class="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm">
                    <p class="text-sm text-gray-800 leading-relaxed">{{ msg.text }}</p>
                  </div>
                </div>
              </div>
              <!-- User message -->
              <div v-else class="flex items-start gap-2.5 justify-end">
                <div class="max-w-[78%]">
                  <p class="text-[10px] font-semibold text-gray-500 mb-1 mr-1 text-right">Candidate</p>
                  <div class="bg-brand-600 rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm">
                    <p class="text-sm text-white leading-relaxed">{{ msg.text }}</p>
                  </div>
                </div>
                <div class="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span class="text-xs font-bold text-gray-600">{{ initials }}</span>
                </div>
              </div>
            </template>
          </div>

          <div v-else-if="!candidate?.recordingUrl" class="text-center py-12 text-gray-400">
            <svg class="w-8 h-8 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <p class="text-sm">No call data available</p>
          </div>
          <div v-else-if="candidate?.recordingUrl && !candidate?.transcript" class="text-center py-8 text-gray-400">
            <p class="text-sm">Recording available but transcript not yet processed</p>
          </div>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="border-t border-gray-200 px-6 py-4 flex-shrink-0 flex items-center justify-between">
        <div class="text-xs text-gray-400">
          Added {{ formatDate(candidate?.createdAt) }}
        </div>
        <button
          v-if="isAdmin"
          class="btn-danger btn-sm"
          @click="showDelete = true"
        >
          Delete candidate
        </button>
      </div>
    </div>
  </Teleport>

  <!-- Delete confirm -->
  <ConfirmDialog
    v-model="showDelete"
    title="Delete candidate?"
    :message="`This will permanently delete ${candidate?.candidateName}. This cannot be undone.`"
    confirm-text="Delete"
    :loading="deleting"
    @confirm="deleteCandidate"
  />
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { candidatesApi } from '@/api'
import api from '@/api'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'

const props = defineProps({
  modelValue: Boolean,
  candidate: Object,
  isAdmin: Boolean,
})
const emit = defineEmits(['update:modelValue', 'updated', 'deleted'])

const activeTab = ref('overview')
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'edit', label: 'Edit' },
  { id: 'transcript', label: 'Transcript' },
]

const STATUSES = ['pending', 'reviewing', 'reviewed', 'called', 'no-answer', 'interview-booked', 'scheduled', 'rejected', 'hired', 'processed']

// Declare refs FIRST before using them in watchers
const editForm = reactive({
  candidateName: '',
  phone: '',
  emailId: '',
  postingName: '',
  location: '',
  hiringManager: '',
  dateApplied: '',
  status: '',
  resumeUrl: '',
})

const managers = ref([])
const postings = ref([])
const selectedManagerLocations = ref([])
const loadingDropdowns = ref(false)

// Load dropdown data when drawer opens
watch(() => props.modelValue, (isOpen) => {
  console.log('Drawer opened:', isOpen)
  if (isOpen && managers.value.length === 0) {
    console.log('Loading dropdown data for first time')
    loadDropdownData()
  } else if (isOpen) {
    console.log('Managers already loaded:', managers.value.length)
  }
})

watch(() => props.candidate, async (c) => {
  if (!c) return

  // Format date for date input (YYYY-MM-DD)
  let formattedDate = ''
  if (c.dateApplied) {
    const date = new Date(c.dateApplied)
    formattedDate = date.toISOString().split('T')[0]
  }

  // Wait for dropdowns to load if not already loaded
  if (managers.value.length === 0) {
    console.log('Waiting for dropdown data to load...')
    await loadDropdownData()
  }

  // Find the matching manager by name and set to their name for display
  let selectedManager = ''
  if (c.hiringManager && managers.value.length > 0) {
    const managerMatch = managers.value.find(m => m.name === c.hiringManager)
    selectedManager = managerMatch ? managerMatch.name : c.hiringManager
  }

  // Find the matching posting by name and set to their name for display
  let selectedPosting = ''
  if (c.postingName && postings.value.length > 0) {
    const postingMatch = postings.value.find(p => p.name === c.postingName)
    selectedPosting = postingMatch ? postingMatch.name : c.postingName
  }

  Object.assign(editForm, {
    candidateName: c.candidateName || '',
    phone: c.phone || '',
    emailId: c.emailId || '',
    postingName: selectedPosting,
    location: c.location || '',
    hiringManager: selectedManager,
    dateApplied: formattedDate,
    status: c.status || '',
    resumeUrl: c.resumeUrl || '',
  })

  // Load manager locations based on selected manager
  if (selectedManager) {
    loadManagerLocations(selectedManager)
  }
  activeTab.value = 'overview'
}, { immediate: true })

const initials = computed(() => {
  const name = props.candidate?.candidateName || ''
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

const parsedTranscript = computed(() => {
  const raw = props.candidate?.transcript || ''
  if (!raw) return []
  const lines = raw.split('\n').filter(l => l.trim())
  return lines.map(line => {
    if (/^AI:/i.test(line)) return { role: 'ai', text: line.replace(/^AI:\s*/i, '').trim() }
    if (/^User:/i.test(line)) return { role: 'user', text: line.replace(/^User:\s*/i, '').trim() }
    // continuation line — attach to last message type or default to ai
    return { role: 'ai', text: line.trim() }
  }).filter(m => m.text)
})

const hasResume = computed(() => !!props.candidate?.emailId)
const resumeLoading = ref(false)
const resumeError = ref('')

async function viewResume() {
  if (!props.candidate?.emailId) return
  resumeLoading.value = true
  resumeError.value = ''
  try {
    const res = await api.get(`/api/candidates/resume/${props.candidate.emailId}`, {
      responseType: 'blob',
    })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Revoke after a short delay to free memory
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  } catch (err) {
    resumeError.value = 'Resume not found or could not be loaded.'
    console.error('Failed to load resume:', err)
  } finally {
    resumeLoading.value = false
  }
}

const saving = ref(false)
const editError = ref('')
const editSuccess = ref(false)

async function loadDropdownData() {
  try {
    loadingDropdowns.value = true
    console.log('Loading dropdown data...')
    const [managersResult, postingsResult] = await Promise.allSettled([
      candidatesApi.getAllManagers(),
      candidatesApi.getAllPostings(),
    ])

    if (managersResult.status === 'fulfilled') {
      const managersRes = managersResult.value
      managers.value = Array.isArray(managersRes.data) ? managersRes.data : managersRes.data?.data || []
      console.log('Loaded managers:', managers.value)
    } else {
      console.error('Failed to load managers:', managersResult.reason?.message)
      managers.value = []
    }

    if (postingsResult.status === 'fulfilled') {
      const postingsRes = postingsResult.value
      postings.value = postingsRes.data?.data || postingsRes.data || []
      console.log('Loaded postings:', postings.value)
    } else {
      console.error('Failed to load postings:', postingsResult.reason?.message)
      postings.value = []
    }
  } finally {
    loadingDropdowns.value = false
  }
}

async function loadManagerLocations(managerName) {
  try {
    // Find the manager ID from the managers list
    const manager = managers.value.find(m => m.name === managerName)
    if (!manager) {
      selectedManagerLocations.value = []
      return
    }

    const res = await candidatesApi.getManagerLocations(manager.id)
    selectedManagerLocations.value = res.data || []

    // If there's only one location and it's not selected, auto-select it
    if (selectedManagerLocations.value.length === 1 && !editForm.location) {
      editForm.location = selectedManagerLocations.value[0].name
    }
  } catch (err) {
    console.error('Failed to load manager locations:', err)
    selectedManagerLocations.value = []
  }
}

function onManagerChange() {
  editForm.location = ''
  loadManagerLocations(editForm.hiringManager)
}

async function saveEdit() {
  saving.value = true
  editError.value = ''
  editSuccess.value = false
  try {
    const { data } = await candidatesApi.update(props.candidate.id, editForm)
    emit('updated', data)
    editSuccess.value = true
    setTimeout(() => editSuccess.value = false, 3000)
  } catch (err) {
    editError.value = err.response?.data?.error || 'Failed to save changes'
  } finally {
    saving.value = false
  }
}

const showDelete = ref(false)
const deleting = ref(false)

async function deleteCandidate() {
  deleting.value = true
  try {
    await candidatesApi.remove(props.candidate.id)
    emit('deleted', props.candidate.id)
    showDelete.value = false
  } catch (err) {
    console.error(err)
  } finally {
    deleting.value = false
  }
}

function close() { emit('update:modelValue', false) }

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1) }
function scoreColor(s) {
  if (s >= 70) return 'text-green-600'
  if (s >= 40) return 'text-yellow-600'
  return 'text-red-500'
}
</script>

<!-- Helper component for read-only info fields -->
<script>
const InfoField = {
  props: { label: String, value: String },
  template: `
    <div>
      <p class="text-xs text-gray-400 mb-0.5">{{ label }}</p>
      <p class="text-sm text-gray-900 font-medium">{{ value || '—' }}</p>
    </div>
  `
}
export { InfoField }
</script>
