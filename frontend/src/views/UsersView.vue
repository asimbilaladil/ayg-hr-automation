<template>
  <div class="space-y-4">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-gray-900">User Management</h2>
      <p class="text-sm text-gray-500 mt-0.5">Manage roles and access for your organisation</p>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">User</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
              <th class="px-4 py-3 font-semibold text-gray-600 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading" v-for="i in 4" :key="i">
              <td colspan="5" class="px-4 py-3">
                <div class="animate-pulse h-4 bg-gray-100 rounded" />
              </td>
            </tr>
            <tr v-else-if="!users.length">
              <td colspan="5" class="px-4 py-12 text-center text-gray-400">No users found</td>
            </tr>
            <tr
              v-else
              v-for="u in users"
              :key="u.id"
              class="hover:bg-gray-50 transition-colors"
              :class="{ 'opacity-50': !u.isActive }"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <span class="text-xs font-semibold text-brand-700">{{ initials(u.name) }}</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ u.name }}</p>
                    <p class="text-xs text-gray-400">{{ u.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <StatusBadge :status="u.role" />
              </td>
              <td class="px-4 py-3">
                <StatusBadge :status="u.isActive ? 'active' : 'inactive'" />
              </td>
              <td class="px-4 py-3 text-xs text-gray-400">{{ formatDate(u.createdAt) }}</td>
              <td class="px-4 py-3">
                <!-- Don't allow editing self -->
                <div v-if="u.id !== auth.user?.id" class="flex items-center justify-center gap-2 flex-wrap">
                  <!-- Role change (Admin only) -->
                  <select
                    v-if="auth.user?.role === 'ADMIN'"
                    :value="u.role"
                    class="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                    @change="changeRole(u, $event.target.value)"
                  >
                    <option value="HR">HR</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <!-- Edit email (Admin + HR) -->
                  <button
                    v-if="auth.user?.role === 'ADMIN' || auth.user?.role === 'HR'"
                    class="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2 py-1 rounded transition-colors"
                    @click="openEmailEdit(u)"
                  >
                    Edit Email
                  </button>

                  <!-- Reset password (Admin + HR) -->
                  <button
                    v-if="(auth.user?.role === 'ADMIN' || auth.user?.role === 'HR') && u.isActive"
                    class="text-xs text-amber-600 hover:text-amber-800 border border-amber-200 hover:border-amber-400 px-2 py-1 rounded transition-colors"
                    @click="confirmReset(u)"
                  >
                    Reset Password
                  </button>

                  <!-- Deactivate (Admin only) -->
                  <button
                    v-if="auth.user?.role === 'ADMIN' && u.isActive"
                    class="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-2 py-1 rounded transition-colors"
                    @click="confirmDeactivate(u)"
                  >
                    Deactivate
                  </button>
                  <span v-else-if="!u.isActive" class="text-xs text-gray-400 italic">Deactivated</span>
                </div>
                <span v-else class="text-xs text-gray-400 italic text-center block">You</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Edit Email Modal ──────────────────────────────────────────── -->
    <div v-if="emailModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900">Edit Email Address</h3>
        <p class="text-sm text-gray-500">
          Updating the email for <span class="font-medium text-gray-800">{{ emailTarget?.name }}</span>.
          This is also their login username.
        </p>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">New Email</label>
          <input
            v-model="newEmail"
            type="email"
            placeholder="name@aygfoods.com"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
            @keyup.enter="doUpdateEmail"
          />
          <p v-if="emailError" class="text-xs text-red-500 mt-1">{{ emailError }}</p>
        </div>
        <div class="flex justify-end gap-3 pt-1">
          <button
            class="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
            @click="emailModal = false"
          >Cancel</button>
          <button
            class="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
            :disabled="savingEmail || !newEmail"
            @click="doUpdateEmail"
          >
            {{ savingEmail ? 'Saving…' : 'Save Email' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Reset Password Result Modal ──────────────────────────────── -->
    <div v-if="resetResultModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900">Temporary Password Generated</h3>
        <p class="text-sm text-gray-500">
          Share this temporary password with <span class="font-medium text-gray-800">{{ resetTarget?.name }}</span>.
          They should change it immediately after logging in.
        </p>
        <div class="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
          <p class="text-2xl font-mono font-bold tracking-widest text-gray-900 select-all">{{ tempPassword }}</p>
        </div>
        <p class="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 border border-amber-200">
          ⚠️ This password will not be shown again. Copy it now.
        </p>
        <div class="flex justify-end gap-3 pt-1">
          <button
            class="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
            @click="copyTempPassword"
          >{{ copied ? '✓ Copied' : 'Copy' }}</button>
          <button
            class="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
            @click="resetResultModal = false"
          >Done</button>
        </div>
      </div>
    </div>

    <!-- ── Role change confirm ───────────────────────────────────────── -->
    <ConfirmDialog
      v-model="roleModal"
      title="Change user role?"
      :message="`Change ${roleTarget?.name} to ${newRole}?`"
      confirm-text="Confirm"
      :loading="saving"
      @confirm="doChangeRole"
    />

    <!-- ── Reset password confirm ────────────────────────────────────── -->
    <ConfirmDialog
      v-model="resetConfirmModal"
      title="Reset password?"
      :message="`Generate a new temporary password for ${resetTarget?.name}? Their current password will be replaced.`"
      confirm-text="Reset"
      :loading="resetting"
      @confirm="doResetPassword"
    />

    <!-- ── Deactivate confirm ─────────────────────────────────────────── -->
    <ConfirmDialog
      v-model="deactivateModal"
      title="Deactivate user?"
      :message="`${deactivateTarget?.name} will no longer be able to log in.`"
      confirm-text="Deactivate"
      :loading="deactivating"
      @confirm="doDeactivate"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usersApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'

const auth = useAuthStore()
const loading = ref(false)
const users = ref([])

async function fetchData() {
  loading.value = true
  try {
    const { data } = await usersApi.list()
    users.value = data?.data || data || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Role change ──────────────────────────────────────────────────────────────
const roleModal = ref(false)
const roleTarget = ref(null)
const newRole = ref('')
const saving = ref(false)

function changeRole(u, role) {
  roleTarget.value = u
  newRole.value = role
  roleModal.value = true
}

async function doChangeRole() {
  saving.value = true
  try {
    const { data } = await usersApi.updateRole(roleTarget.value.id, newRole.value)
    const idx = users.value.findIndex(u => u.id === roleTarget.value.id)
    if (idx !== -1) users.value[idx] = { ...users.value[idx], ...data }
    roleModal.value = false
  } catch (err) {
    console.error(err)
    roleModal.value = false
    fetchData()
  } finally {
    saving.value = false
  }
}

// ── Email edit ───────────────────────────────────────────────────────────────
const emailModal = ref(false)
const emailTarget = ref(null)
const newEmail = ref('')
const emailError = ref('')
const savingEmail = ref(false)

function openEmailEdit(u) {
  emailTarget.value = u
  newEmail.value = u.email
  emailError.value = ''
  emailModal.value = true
}

async function doUpdateEmail() {
  if (!newEmail.value) return
  emailError.value = ''
  savingEmail.value = true
  try {
    const { data } = await usersApi.updateEmail(emailTarget.value.id, newEmail.value)
    const idx = users.value.findIndex(u => u.id === emailTarget.value.id)
    if (idx !== -1) users.value[idx] = { ...users.value[idx], ...data }
    emailModal.value = false
  } catch (err) {
    const msg = err.response?.data?.error || 'Failed to update email'
    emailError.value = msg
  } finally {
    savingEmail.value = false
  }
}

// ── Reset password ───────────────────────────────────────────────────────────
const resetConfirmModal = ref(false)
const resetResultModal = ref(false)
const resetTarget = ref(null)
const tempPassword = ref('')
const resetting = ref(false)
const copied = ref(false)

function confirmReset(u) {
  resetTarget.value = u
  resetConfirmModal.value = true
}

async function doResetPassword() {
  resetting.value = true
  try {
    const { data } = await usersApi.resetPassword(resetTarget.value.id)
    tempPassword.value = data.tempPassword
    resetConfirmModal.value = false
    copied.value = false
    resetResultModal.value = true
  } catch (err) {
    console.error(err)
    resetConfirmModal.value = false
  } finally {
    resetting.value = false
  }
}

function copyTempPassword() {
  navigator.clipboard.writeText(tempPassword.value).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}

// ── Deactivate ───────────────────────────────────────────────────────────────
const deactivateModal = ref(false)
const deactivateTarget = ref(null)
const deactivating = ref(false)

function confirmDeactivate(u) {
  deactivateTarget.value = u
  deactivateModal.value = true
}

async function doDeactivate() {
  deactivating.value = true
  try {
    const { data } = await usersApi.deactivate(deactivateTarget.value.id)
    const idx = users.value.findIndex(u => u.id === deactivateTarget.value.id)
    if (idx !== -1) users.value[idx] = { ...users.value[idx], ...data }
    deactivateModal.value = false
  } catch (err) {
    console.error(err)
  } finally {
    deactivating.value = false
  }
}

onMounted(fetchData)
</script>
