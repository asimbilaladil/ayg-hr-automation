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

    <!-- Stats -->
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
            <tr v-if="loading" v-for="i in 4" :key="i">
              <td colspan="7" class="px-4 py-3">
                <div class="animate-pulse h-4 bg-gray-100 rounded w-3/4" />
              </td>
            </tr>
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
            <tr
              v-else
              v-for="emp in filtered"
              :key="emp.id"
              class="hover:bg-gray-50 transition-colors cursor-pointer"
              @click="openDetail(emp)"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ emp.firstName }} {{ emp.lastName }}</div>
                <div class="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                  <span>ID {{ emp.revelId }}</span>
                  <span v-if="emp.review" class="inline-flex items-center gap-0.5 text-purple-600">
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                      <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>
                    </svg>
                    Review recorded
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-600">
                <div v-if="emp.phone" class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  <a :href="`tel:${emp.phone}`" class="hover:text-brand-600 transition-colors" @click.stop>{{ emp.phone }}</a>
                </div>
                <div v-if="emp.email" class="flex items-center gap-1.5 mt-0.5">
                  <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <a :href="`mailto:${emp.email}`" class="hover:text-brand-600 transition-colors text-xs truncate max-w-[160px]" @click.stop>{{ emp.email }}</a>
                </div>
                <span v-if="!emp.phone && !emp.email" class="text-xs text-gray-300">—</span>
              </td>
              <td class="px-4 py-3 text-gray-600">
                <span v-if="emp.location">{{ emp.location.name }}</span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>
              <td class="px-4 py-3 text-gray-600">
                <span v-if="emp.location?.manager">{{ emp.location.manager.name }}</span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>
              <td class="px-4 py-3 text-gray-600">
                <span v-if="emp.employeeStart">{{ formatDate(emp.employeeStart) }}</span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-1">
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit"
                    :class="emp.called ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="emp.called ? 'bg-green-500' : 'bg-amber-500'" />
                    {{ emp.called ? 'Called' : 'Pending' }}
                  </span>
                  <span v-if="emp.calledAt" class="text-xs text-gray-400">{{ formatDate(emp.calledAt) }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-center" @click.stop>
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

    <!-- ── Detail Slide-over ── -->
    <Transition name="slide">
      <div v-if="detail" class="fixed inset-0 z-50 flex justify-end">
        <!-- backdrop -->
        <div class="absolute inset-0 bg-black/40" @click="closeDetail" />

        <!-- panel -->
        <div class="relative w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
          <!-- Panel header -->
          <div class="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between z-10">
            <div>
              <h3 class="text-lg font-bold text-gray-900">{{ detail.firstName }} {{ detail.lastName }}</h3>
              <p class="text-sm text-gray-500 mt-0.5">30-Day Check-in Review</p>
            </div>
            <button class="text-gray-400 hover:text-gray-700 transition-colors ml-4 mt-0.5" @click="closeDetail">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="flex-1 px-6 py-5 space-y-5">
            <!-- Employee info card -->
            <div class="rounded-xl bg-gray-50 border border-gray-200 p-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Location</p>
                <p class="font-medium text-gray-800">{{ detail.location?.name ?? '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Manager</p>
                <p class="font-medium text-gray-800">{{ detail.location?.manager?.name ?? '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Phone</p>
                <a v-if="detail.phone" :href="`tel:${detail.phone}`" class="font-medium text-brand-600 hover:underline">{{ detail.phone }}</a>
                <p v-else class="text-gray-300 text-xs">—</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Start Date</p>
                <p class="font-medium text-gray-800">{{ detail.employeeStart ? formatDate(detail.employeeStart) : '—' }}</p>
              </div>
            </div>

            <!-- No review yet -->
            <template v-if="!review && !reviewLoading">
              <div class="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
                <svg class="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p class="text-sm font-medium text-gray-500">No review recorded yet</p>
                <p class="text-xs mt-1">The AI call review will appear here after the check-in call</p>
              </div>
            </template>

            <!-- Loading -->
            <template v-else-if="reviewLoading">
              <div class="space-y-3">
                <div v-for="i in 5" :key="i" class="animate-pulse h-16 bg-gray-100 rounded-xl" />
              </div>
            </template>

            <!-- Review -->
            <template v-else-if="review">
              <!-- Header row -->
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-semibold text-gray-700">Check-in Results</h4>
                <span class="text-xs text-gray-400">{{ formatDate(review.reviewedAt) }}</span>
              </div>

              <!-- Average score -->
              <div v-if="averageScore" class="rounded-xl bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-100 p-4 flex items-center justify-between">
                <div>
                  <p class="text-xs text-gray-500 mb-0.5">Overall Score</p>
                  <p class="text-2xl font-bold text-brand-700">{{ averageScore }}<span class="text-sm font-normal text-gray-400"> / 5</span></p>
                </div>
                <div class="flex gap-1">
                  <span
                    v-for="i in 5" :key="i"
                    class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold"
                    :class="i <= Math.round(averageScore) ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-400'"
                  >{{ i }}</span>
                </div>
              </div>

              <!-- Answer cards from VAPI answers array -->
              <div v-if="parsedAnswers.length" class="space-y-3">
                <div
                  v-for="(a, idx) in parsedAnswers"
                  :key="idx"
                  class="rounded-xl border border-gray-200 bg-white overflow-hidden"
                >
                  <!-- Card header -->
                  <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span class="text-xs font-semibold text-brand-700 uppercase tracking-wide">{{ a.category }}</span>
                    <!-- Rating badge if present -->
                    <span
                      v-if="a.rating"
                      class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      :class="ratingColor(a.rating)"
                    >
                      <span class="flex gap-0.5">
                        <span
                          v-for="i in 5" :key="i"
                          class="w-2 h-2 rounded-full"
                          :class="i <= a.rating ? 'bg-current' : 'bg-gray-300 opacity-40'"
                        />
                      </span>
                      {{ ratingLabel(a.rating) }}
                    </span>
                    <span v-else class="text-xs text-gray-400 italic">No rating</span>
                  </div>
                  <!-- Question -->
                  <div class="px-4 pt-3 pb-1">
                    <p class="text-xs text-gray-500 leading-snug">{{ a.question }}</p>
                  </div>
                  <!-- Answer -->
                  <div class="px-4 pb-4 pt-1">
                    <p class="text-sm text-gray-800 leading-relaxed">{{ a.answer }}</p>
                  </div>
                </div>
              </div>

              <!-- Fallback: structured q* fields (if no answers array) -->
              <div v-else class="space-y-3">
                <template v-for="q in structuredQuestions" :key="q.label">
                  <div v-if="q.notes || q.rating" class="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                      <span class="text-xs font-semibold text-brand-700 uppercase tracking-wide">{{ q.category }}</span>
                      <span v-if="q.rating" class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" :class="ratingColor(q.rating)">
                        {{ ratingLabel(q.rating) }}
                      </span>
                    </div>
                    <div class="px-4 pt-3 pb-1">
                      <p class="text-xs text-gray-500">{{ q.label }}</p>
                    </div>
                    <div v-if="q.notes" class="px-4 pb-4 pt-1">
                      <p class="text-sm text-gray-800 leading-relaxed">{{ q.notes }}</p>
                    </div>
                  </div>
                </template>
              </div>

              <!-- Overall notes -->
              <div v-if="review.overallNotes" class="rounded-xl border border-brand-200 bg-brand-50 p-4">
                <p class="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1.5">Overall Notes</p>
                <p class="text-sm text-gray-800 leading-relaxed">{{ review.overallNotes }}</p>
              </div>

              <!-- Call status & recording -->
              <div v-if="review.callStatus || review.recordingUrl" class="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Call Info</p>
                <div v-if="review.callStatus" class="flex items-center gap-2">
                  <span class="text-xs text-gray-500">Status:</span>
                  <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{{ review.callStatus }}</span>
                </div>
                <div v-if="review.recordingUrl">
                  <p class="text-xs text-gray-500 mb-1">Recording</p>
                  <audio controls class="w-full h-8" :src="review.recordingUrl" />
                </div>
              </div>

              <!-- Transcript -->
              <div v-if="review.transcript" class="rounded-xl border border-gray-200 bg-white p-4">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Call Transcript</p>
                <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">{{ review.transcript }}</p>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onboardingApi } from '@/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const RATING_LABELS = { 1: 'Very Poor', 2: 'Poor', 3: 'Fair', 4: 'Good', 5: 'Excellent' }
const RATING_COLORS = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-blue-100 text-blue-700',
  5: 'bg-green-100 text-green-700',
}

function ratingLabel(r) { return RATING_LABELS[r] ?? '' }
function ratingColor(r) { return RATING_COLORS[r] ?? 'bg-gray-100 text-gray-600' }

// ── Main component ────────────────────────────────────────────────────────────

const employees    = ref([])
const loading      = ref(false)
const toggling     = ref(null)
const activeFilter = ref('all')

const detail        = ref(null)
const review        = ref(null)
const reviewLoading = ref(false)

const filters = [
  { label: 'All',     value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Called',  value: 'called' },
]

const filtered     = computed(() => {
  if (activeFilter.value === 'pending') return employees.value.filter(e => !e.called)
  if (activeFilter.value === 'called')  return employees.value.filter(e => e.called)
  return employees.value
})
const calledCount  = computed(() => employees.value.filter(e => e.called).length)
const pendingCount = computed(() => employees.value.filter(e => !e.called).length)

// Parse stored answers JSON string into array, merging structured q*Rating fields by category
const CATEGORY_RATING_MAP = {
  'Role Experience':    'q1Rating',
  'Training & Support': 'q2Rating',
  'Culture Fit':        'q4Rating',
}
const parsedAnswers = computed(() => {
  if (!review.value?.answers) return []
  try {
    const arr = typeof review.value.answers === 'string'
      ? JSON.parse(review.value.answers)
      : review.value.answers
    if (!Array.isArray(arr)) return []
    return arr.map(a => ({
      ...a,
      rating: a.rating ?? review.value[CATEGORY_RATING_MAP[a.category]] ?? null,
    }))
  } catch { return [] }
})

// Fallback structured questions for when no answers array is present
const structuredQuestions = computed(() => {
  if (!review.value) return []
  return [
    { category: 'Role Experience',    label: 'How are you finding your role so far?',                   rating: review.value.q1Rating, notes: review.value.q1Notes },
    { category: 'Training & Support', label: 'Received adequate training and support?',                 rating: review.value.q2Rating, notes: review.value.q2Notes },
    { category: 'Surprises',          label: 'Any aspects of the job that surprised you?',              rating: null,                  notes: review.value.q3Notes },
    { category: 'Culture Fit',        label: 'How do you feel about team dynamics and company culture?', rating: review.value.q4Rating, notes: review.value.q4Notes },
    { category: 'Accomplishments',    label: 'What have you accomplished so far?',                      rating: null,                  notes: review.value.q5Notes },
    { category: 'Clarity',            label: 'Is there anything you need more clarity on?',             rating: null,                  notes: review.value.q6Notes },
    { category: 'Support Needed',     label: 'How can we support you better?',                          rating: null,                  notes: review.value.q7Notes },
  ].filter(q => q.notes || q.rating)
})

const averageScore = computed(() => {
  if (!review.value) return null
  // prefer ratings from parsed answers array
  const fromAnswers = parsedAnswers.value.map(a => a.rating).filter(Boolean)
  const fromFields  = [review.value.q1Rating, review.value.q2Rating, review.value.q4Rating].filter(Boolean)
  const scores = fromAnswers.length ? fromAnswers : fromFields
  if (!scores.length) return null
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
})

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
    if (idx !== -1) employees.value[idx] = { ...employees.value[idx], ...data }
  } finally {
    toggling.value = null
  }
}

async function openDetail(emp) {
  detail.value = emp
  review.value = emp.review ?? null

  if (!emp.review) {
    reviewLoading.value = true
    try {
      const { data } = await onboardingApi.getReview(emp.id)
      review.value = data
    } finally {
      reviewLoading.value = false
    }
  }
}

function closeDetail() {
  detail.value = null
  review.value = null
}

onMounted(load)
</script>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: opacity 0.2s ease; }
.slide-enter-active .relative, .slide-leave-active .relative { transition: transform 0.25s ease; }
.slide-enter-from { opacity: 0; }
.slide-enter-from .relative { transform: translateX(100%); }
.slide-leave-to { opacity: 0; }
.slide-leave-to .relative { transform: translateX(100%); }
</style>
