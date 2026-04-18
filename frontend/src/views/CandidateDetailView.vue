<template>
  <div>
    <!-- Back -->
    <RouterLink to="/candidates" class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5 group">
      <svg class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Candidates
    </RouterLink>

    <div v-if="loading" class="space-y-4">
      <div class="card p-6 animate-pulse space-y-3">
        <div class="h-6 bg-gray-200 rounded w-1/3" />
        <div class="h-4 bg-gray-100 rounded w-1/4" />
      </div>
    </div>

    <div v-else-if="candidate" class="space-y-6">
      <!-- Header card -->
      <div class="card p-6">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span class="text-brand-700 font-bold text-xl">{{ initials }}</span>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ candidate.candidateName }}</h1>
              <p class="text-gray-500">{{ candidate.postingName }} · {{ candidate.location }}</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <StatusBadge :status="candidate.status" />
                <StatusBadge v-if="candidate.aiRecommendation" :status="candidate.aiRecommendation" />
              </div>
            </div>
          </div>
          <div v-if="candidate.aiScore != null" class="text-center">
            <div class="text-4xl font-bold" :class="scoreColor(candidate.aiScore)">{{ candidate.aiScore }}%</div>
            <p class="text-xs text-gray-400 mt-1">AI Score</p>
          </div>
        </div>
      </div>

      <!-- Details grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Contact & basic info -->
        <div class="card p-5">
          <h3 class="font-semibold text-gray-900 mb-4">Contact Information</h3>
          <dl class="space-y-3">
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500">Email</dt>
              <dd class="text-sm font-medium text-gray-900 break-all">{{ candidate.emailId }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500">Phone</dt>
              <dd class="text-sm font-medium text-gray-900">{{ candidate.phone || '—' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500">Posting</dt>
              <dd class="text-sm font-medium text-gray-900">{{ candidate.postingName || '—' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500">Location</dt>
              <dd class="text-sm font-medium text-gray-900">{{ candidate.location || '—' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500">Hiring Manager</dt>
              <dd class="text-sm font-medium text-gray-900">{{ candidate.hiringManager || '—' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500">Recruiter</dt>
              <dd class="text-sm font-medium text-gray-900">{{ candidate.recruiter || '—' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500">Date Applied</dt>
              <dd class="text-sm font-medium text-gray-900">{{ candidate.dateApplied || '—' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500">Received At</dt>
              <dd class="text-sm font-medium text-gray-900">{{ formatDate(candidate.receivedAt) }}</dd>
            </div>
          </dl>
        </div>

        <!-- AI Analysis -->
        <div class="card p-5">
          <h3 class="font-semibold text-gray-900 mb-4">AI Analysis</h3>
          <div v-if="candidate.aiSummary" class="mb-4">
            <p class="text-xs text-gray-500 mb-1">Summary</p>
            <p class="text-sm text-gray-700 leading-relaxed">{{ candidate.aiSummary }}</p>
          </div>
          <div v-if="candidate.aiCriteriaMet" class="mb-3">
            <p class="text-xs font-medium text-green-700 mb-1">✓ Criteria Met</p>
            <p class="text-sm text-green-800 bg-green-50 rounded-lg p-3">{{ candidate.aiCriteriaMet }}</p>
          </div>
          <div v-if="candidate.aiCriteriaMissing">
            <p class="text-xs font-medium text-red-700 mb-1">✗ Criteria Missing</p>
            <p class="text-sm text-red-800 bg-red-50 rounded-lg p-3">{{ candidate.aiCriteriaMissing }}</p>
          </div>
          <div v-if="!candidate.aiSummary && !candidate.aiCriteriaMet && !candidate.aiCriteriaMissing" class="text-sm text-gray-400">
            No AI analysis yet
          </div>
        </div>
      </div>

      <!-- Resume -->
      <div class="card p-5">
        <h3 class="font-semibold text-gray-900 mb-4">Resume</h3>
        <div v-if="resumeUrl" class="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-gray-900">Resume Available</p>
              <p class="text-xs text-gray-500">PDF Document</p>
            </div>
          </div>
          <a
            :href="resumeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-primary btn-sm"
          >
            View Resume
          </a>
        </div>
        <div v-else class="text-center py-8 text-gray-400">
          <svg class="w-8 h-8 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          No resume available
        </div>
      </div>

      <!-- Transcript -->
      <div v-if="candidate.transcript" class="card p-5">
        <h3 class="font-semibold text-gray-900 mb-4">Call Transcript</h3>
        <div class="bg-gray-50 rounded-lg p-4 text-xs font-mono text-gray-700 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">{{ candidate.transcript }}</div>
      </div>
    </div>

    <div v-else class="text-center py-20 text-gray-400">
      Candidate not found.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { candidatesApi } from '@/api'
import StatusBadge from '@/components/shared/StatusBadge.vue'

const route = useRoute()
const loading = ref(true)
const candidate = ref(null)

const initials = computed(() => {
  const name = candidate.value?.candidateName || ''
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

const resumeUrl = computed(() => {
  // Use API endpoint to serve the resume
  if (candidate.value?.emailId) {
    return `/api/candidates/resume/${candidate.value.emailId}`
  }
  return null
})

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function scoreColor(s) {
  if (s >= 70) return 'text-green-600'
  if (s >= 40) return 'text-yellow-600'
  return 'text-red-500'
}

onMounted(async () => {
  try {
    const { data } = await candidatesApi.getById(route.params.id)
    candidate.value = data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
})
</script>
