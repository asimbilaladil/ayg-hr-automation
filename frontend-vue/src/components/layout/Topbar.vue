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
      <div class="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center">
        <span class="text-xs font-semibold text-white">{{ userInitials }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
</script>
