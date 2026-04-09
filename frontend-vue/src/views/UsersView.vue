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
              <th class="px-4 py-3">Actions</th>
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
                <div v-if="u.id !== auth.user?.id" class="flex items-center gap-2">
                  <!-- Role change -->
                  <select
                    :value="u.role"
                    class="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                    @change="changeRole(u, $event.target.value)"
                  >
                    <option value="HR">HR</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <!-- Deactivate -->
                  <button
                    v-if="u.isActive"
                    class="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-2 py-1 rounded transition-colors"
                    @click="confirmDeactivate(u)"
                  >
                    Deactivate
                  </button>
                  <span v-else class="text-xs text-gray-400 italic">Deactivated</span>
                </div>
                <span v-else class="text-xs text-gray-400 italic">You</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Role change confirm -->
    <ConfirmDialog
      v-model="roleModal"
      title="Change user role?"
      :message="`Change ${roleTarget?.name} to ${newRole}?`"
      confirm-text="Confirm"
      :loading="saving"
      @confirm="doChangeRole"
    />

    <!-- Deactivate confirm -->
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

// Role change
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
    if (idx !== -1) users.value[idx] = data
    roleModal.value = false
  } catch (err) {
    console.error(err)
    roleModal.value = false
    // Refresh to revert optimistic UI
    fetchData()
  } finally {
    saving.value = false
  }
}

// Deactivate
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
    if (idx !== -1) users.value[idx] = data
    deactivateModal.value = false
  } catch (err) {
    console.error(err)
  } finally {
    deactivating.value = false
  }
}

onMounted(fetchData)
</script>
