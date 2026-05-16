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

      <!-- Notification bell -->
      <div class="relative" ref="notifRef">
        <button
          class="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          @click="toggleNotif"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          <span
            v-if="unreadCount > 0"
            class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
          >{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </button>

        <!-- Notifications dropdown -->
        <Transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="transform opacity-0 scale-95"
          enter-to-class="transform opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="transform opacity-100 scale-100"
          leave-to-class="transform opacity-0 scale-95"
        >
          <div
            v-if="notifOpen"
            class="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden"
          >
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p class="text-sm font-semibold text-gray-900">Notifications</p>
              <button
                v-if="unreadCount > 0"
                class="text-xs text-brand-600 hover:text-brand-700 font-medium"
                @click="doMarkAllRead"
              >Mark all read</button>
            </div>
            <div class="max-h-80 overflow-y-auto divide-y divide-gray-50">
              <div v-if="!notifications.length" class="px-4 py-8 text-center text-sm text-gray-400">
                No notifications
              </div>
              <div
                v-for="n in notifications"
                :key="n.id"
                class="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                :class="{ 'bg-blue-50/50': !n.read }"
                @click="doMarkOneRead(n)"
              >
                <div class="flex items-start gap-2">
                  <span v-if="!n.read" class="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span v-else class="mt-1.5 w-2 h-2 flex-shrink-0" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-900">{{ n.title }}</p>
                    <p class="text-xs text-gray-500 mt-0.5 leading-relaxed">{{ n.body }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ timeAgo(n.createdAt) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Profile dropdown trigger -->
      <div class="relative" ref="dropdownRef">
        <button
          class="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-1"
          @click="dropdownOpen = !dropdownOpen"
        >
          <span class="text-xs font-semibold text-white">{{ userInitials }}</span>
        </button>

        <!-- Dropdown menu -->
        <Transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="transform opacity-0 scale-95"
          enter-to-class="transform opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="transform opacity-100 scale-100"
          leave-to-class="transform opacity-0 scale-95"
        >
          <div
            v-if="dropdownOpen"
            class="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden"
          >
            <!-- User info -->
            <div class="px-4 py-3 border-b border-gray-100">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ auth.user?.name }}</p>
              <p class="text-xs text-gray-400 truncate">{{ auth.user?.email }}</p>
            </div>

            <!-- Menu items -->
            <div class="py-1">
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                @click="openChangePassword"
              >
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Change Password
              </button>

              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                @click="doLogout"
              >
                <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>

  <!-- ── Change Password Modal ──────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="cpModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h3 class="text-lg font-bold text-gray-900">Change Password</h3>
          <p class="text-sm text-gray-500 mt-0.5">Signed in as <span class="font-medium text-gray-700">{{ auth.user?.name }}</span></p>
        </div>

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

        <p v-if="cpError"   class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{{ cpError }}</p>
        <p v-if="cpSuccess" class="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">✓ Password changed successfully!</p>

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
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usersApi, notificationsApi } from '@/api'

defineEmits(['toggle-sidebar'])

const auth   = useAuthStore()
const route  = useRoute()
const router = useRouter()

const pageTitles = {
  '/dashboard':    'Dashboard',
  '/candidates':   'Candidates',
  '/appointments': 'Appointments',
  '/availability': 'Availability',
  '/users':        'User Management',
}

const pageTitle = computed(() => {
  if (route.name === 'CandidateDetail') return 'Candidate Detail'
  return pageTitles[route.path] || 'TalentFlow'
})

const userInitials = computed(() => {
  if (!auth.user?.name) return '?'
  return auth.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

// ── Profile dropdown ─────────────────────────────────────────────────────────
const dropdownOpen = ref(false)
const dropdownRef  = ref(null)

function handleOutsideClick(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    dropdownOpen.value = false
  }
  if (notifRef.value && !notifRef.value.contains(e.target)) {
    notifOpen.value = false
  }
}

// ── Notifications ────────────────────────────────────────────────────────────
const notifOpen = ref(false)
const notifRef = ref(null)
const notifications = ref([])
const unreadCount = ref(0)

function toggleNotif() { notifOpen.value = !notifOpen.value }

async function fetchNotifications() {
  try {
    const { data } = await notificationsApi.list()
    notifications.value = data.notifications || []
    unreadCount.value = data.unreadCount || 0
  } catch {}
}

async function doMarkAllRead() {
  await notificationsApi.markAllRead()
  notifications.value = notifications.value.map(n => ({ ...n, read: true }))
  unreadCount.value = 0
}

async function doMarkOneRead(n) {
  if (!n.read) {
    await notificationsApi.markOneRead(n.id)
    n.read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

let notifTimer = null

onMounted(()  => {
  document.addEventListener('click', handleOutsideClick)
  fetchNotifications()
  notifTimer = setInterval(fetchNotifications, 30000)
})
onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  clearInterval(notifTimer)
})

function doLogout() {
  dropdownOpen.value = false
  auth.logout()
  router.push('/login')
}

// ── Change Password ──────────────────────────────────────────────────────────
const cpModal   = ref(false)
const cpSaving  = ref(false)
const cpError   = ref('')
const cpSuccess = ref(false)
const cpForm    = reactive({ current: '', newPass: '', confirm: '' })

function openChangePassword() {
  dropdownOpen.value  = false
  cpForm.current      = ''
  cpForm.newPass      = ''
  cpForm.confirm      = ''
  cpError.value       = ''
  cpSuccess.value     = false
  cpModal.value       = true
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
    cpForm.current  = ''
    cpForm.newPass  = ''
    cpForm.confirm  = ''
    setTimeout(() => { cpModal.value = false }, 1500)
  } catch (err) {
    cpError.value = err.response?.data?.error || 'Failed to change password.'
  } finally {
    cpSaving.value = false
  }
}
</script>
