<template>
  <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
    <!-- Mobile hamburger -->
    <button
      class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      @click="$emit('toggle-sidebar')"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Page title -->
    <h1 class="text-lg font-semibold text-gray-900 lg:ml-0 ml-2">{{ pageTitle }}</h1>

    <!-- Right side -->
    <div class="flex items-center gap-3">
      <span class="hidden sm:inline-flex badge bg-brand-100 text-brand-800">
        {{ auth.user?.role }}
      </span>

      <!-- Avatar — click to open change password -->
      <button
        class="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-1"
        title="Change password"
        @click="openChangePassword"
      >
        <span class="text-xs font-semibold text-white">{{ userInitials }}</span>
      </button>
    </div>
  </header>

  <!-- ── Change Password Modal ──────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="cpModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <!-- Header -->
        <div>
          <h3 class="text-lg font-bold text-gray-900">Change Password</h3>
          <p class="text-sm text-gray-500 mt-0.5">Signed in as <span class="font-medium text-gray-700">{{ auth.user?.name }}</span></p>
        </div>

        <!-- Fields -->
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
            <input
              v-model="cpForm.current"
              type="password"
              placeholder="Enter current password"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
              autocomplete="current-password"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">New Password</label>
            <input
              v-model="cpForm.newPass"
              type="password"
              placeholder="At least 8 characters"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
              autocomplete="new-password"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
            <input
              v-model="cpForm.confirm"
              type="password"
              placeholder="Repeat new password"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
              @keyup.enter="submitChangePassword"
              autocomplete="new-password"
            />
          </div>
        </div>

        <!-- Error / success -->
        <p v-if="cpError" class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{{ cpError }}</p>
        <p v-if="cpSuccess" class="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">✓ Password changed successfully!</p>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-1">
          <button
            class="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
            @click="cpModal = false"
          >Cancel</button>
          <button
            class="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
            :disabled="cpSaving || !cpForm.current || !cpForm.newPass || !cpForm.confirm"
            @click="submitChangePassword"
          >
            {{ cpSaving ? 'Saving…' : 'Change Password' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usersApi } from '@/api'

defineEmits(['toggle-sidebar'])

const auth = useAuthStore()
const route = useRoute()

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/candidates': 'Candidates',
  '/appointments': 'Appointments',
  '/availability': 'Availability',
  '/users': 'User Management',
}

const pageTitle = computed(() => {
  if (route.name === 'CandidateDetail') return 'Candidate Detail'
  return pageTitles[route.path] || 'TalentFlow'
})

const userInitials = computed(() => {
  if (!auth.user?.name) return '?'
  return auth.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

// ── Change Password ──────────────────────────────────────────────────────────
const cpModal   = ref(false)
const cpSaving  = ref(false)
const cpError   = ref('')
const cpSuccess = ref(false)
const cpForm    = reactive({ current: '', newPass: '', confirm: '' })

function openChangePassword() {
  cpForm.current = ''
  cpForm.newPass = ''
  cpForm.confirm = ''
  cpError.value   = ''
  cpSuccess.value = false
  cpModal.value   = true
}

async function submitChangePassword() {
  cpError.value   = ''
  cpSuccess.value = false

  if (!cpForm.current || !cpForm.newPass || !cpForm.confirm) {
    cpError.value = 'All fields are required.'
    return
  }
  if (cpForm.newPass.length < 8) {
    cpError.value = 'New password must be at least 8 characters.'
    return
  }
  if (cpForm.newPass !== cpForm.confirm) {
    cpError.value = 'New passwords do not match.'
    return
  }

  cpSaving.value = true
  try {
    await usersApi.changePassword(cpForm.current, cpForm.newPass)
    cpSuccess.value = true
    cpForm.current = ''
    cpForm.newPass = ''
    cpForm.confirm = ''
    // Auto-close after 1.5 s
    setTimeout(() => { cpModal.value = false }, 1500)
  } catch (err) {
    cpError.value = err.response?.data?.error || 'Failed to change password.'
  } finally {
    cpSaving.value = false
  }
}
</script>
