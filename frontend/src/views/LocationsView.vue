<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">Locations</h2>
        <p class="text-sm text-gray-500 mt-0.5">Manage LCF locations and their details</p>
      </div>
      <button
        v-if="auth.user?.role === 'ADMIN'"
        class="btn-primary"
        @click="openCreate"
      >+ Add Location</button>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Address</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Manager</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Candidates</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th class="px-4 py-3 font-semibold text-gray-600 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading" v-for="i in 3" :key="i">
              <td colspan="6" class="px-4 py-3">
                <div class="animate-pulse h-4 bg-gray-100 rounded" />
              </td>
            </tr>
            <tr v-else-if="!locations.length">
              <td colspan="6" class="px-4 py-12 text-center text-gray-400">No locations found</td>
            </tr>
            <tr
              v-else
              v-for="loc in locations"
              :key="loc.id"
              class="hover:bg-gray-50 transition-colors"
              :class="{ 'opacity-50': !loc.isActive }"
            >
              <td class="px-4 py-3 font-medium text-gray-900">{{ loc.name }}</td>
              <td class="px-4 py-3 text-gray-500">
                <span v-if="loc.address">{{ loc.address }}</span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>
              <td class="px-4 py-3 text-gray-600">
                <span v-if="loc.manager">{{ loc.manager.name }}</span>
                <span v-else class="text-xs text-gray-300">Unassigned</span>
              </td>
              <td class="px-4 py-3 text-gray-500">{{ loc._count?.candidates ?? 0 }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="loc.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                >{{ loc.isActive ? 'Active' : 'Inactive' }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="relative inline-block">
                  <button
                    class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                    @click.stop="toggleMenu(loc.id)"
                  >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                    </svg>
                  </button>

                  <div
                    v-if="activeMenuId === loc.id"
                    class="absolute right-0 top-8 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44"
                    @click.stop
                  >
                    <!-- Edit address — available to all roles for their own location -->
                    <button
                      class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      @click="openEditAddress(loc); activeMenuId = null"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      Edit Address
                    </button>

                    <!-- ADMIN-only actions -->
                    <template v-if="auth.user?.role === 'ADMIN'">
                      <div class="border-t border-gray-100 mt-1 pt-1">
                        <button
                          class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          @click="confirmDelete(loc); activeMenuId = null"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                          Delete
                        </button>
                      </div>
                    </template>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Create Location Modal (ADMIN only) ── -->
    <div v-if="createModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900">Add Location</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Name <span class="text-red-500">*</span></label>
            <input
              v-model="createForm.name"
              type="text"
              placeholder="e.g. Bradford LCF"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Address</label>
            <input
              v-model="createForm.address"
              type="text"
              placeholder="e.g. 12 High Street, Bradford, BD1 1AA"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
        <p v-if="formError" class="text-xs text-red-500">{{ formError }}</p>
        <div class="flex justify-end gap-3 pt-1">
          <button
            class="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
            @click="createModal = false"
          >Cancel</button>
          <button
            class="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
            :disabled="saving || !createForm.name.trim()"
            @click="doCreate"
          >{{ saving ? 'Saving…' : 'Add Location' }}</button>
        </div>
      </div>
    </div>

    <!-- ── Edit Address Modal (all roles) ── -->
    <div v-if="addressModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900">Edit Address</h3>
        <p class="text-sm text-gray-500">
          Update the address for <span class="font-medium text-gray-800">{{ addressTarget?.name }}</span>.
        </p>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Address</label>
          <input
            v-model="addressValue"
            type="text"
            placeholder="e.g. 12 High Street, Bradford, BD1 1AA"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
            @keyup.enter="doEditAddress"
          />
        </div>
        <p v-if="formError" class="text-xs text-red-500">{{ formError }}</p>
        <div class="flex justify-end gap-3 pt-1">
          <button
            class="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
            @click="addressModal = false"
          >Cancel</button>
          <button
            class="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
            :disabled="saving"
            @click="doEditAddress"
          >{{ saving ? 'Saving…' : 'Save Address' }}</button>
        </div>
      </div>
    </div>

    <!-- ── Delete Confirm Modal (ADMIN only) ── -->
    <div v-if="deleteModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900">Delete Location</h3>
        <p class="text-sm text-gray-600">
          Are you sure you want to delete <span class="font-medium text-gray-900">{{ deleteTarget?.name }}</span>?
          This cannot be undone.
        </p>
        <p v-if="formError" class="text-xs text-red-500">{{ formError }}</p>
        <div class="flex justify-end gap-3 pt-1">
          <button
            class="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
            @click="deleteModal = false"
          >Cancel</button>
          <button
            class="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            :disabled="saving"
            @click="doDelete"
          >{{ saving ? 'Deleting…' : 'Delete' }}</button>
        </div>
      </div>
    </div>

    <!-- Click-outside overlay to close menus -->
    <div v-if="activeMenuId" class="fixed inset-0 z-20" @click="activeMenuId = null" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { locationsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const locations = ref([])
const loading = ref(false)
const saving = ref(false)
const formError = ref('')
const activeMenuId = ref(null)

// Modals
const createModal = ref(false)
const addressModal = ref(false)
const deleteModal = ref(false)

const createForm = ref({ name: '', address: '' })
const addressTarget = ref(null)
const addressValue = ref('')
const deleteTarget = ref(null)

function toggleMenu(id) {
  activeMenuId.value = activeMenuId.value === id ? null : id
}

function openCreate() {
  createForm.value = { name: '', address: '' }
  formError.value = ''
  createModal.value = true
}

function openEditAddress(loc) {
  addressTarget.value = loc
  addressValue.value = loc.address || ''
  formError.value = ''
  addressModal.value = true
}

function confirmDelete(loc) {
  deleteTarget.value = loc
  formError.value = ''
  deleteModal.value = true
}

async function load() {
  loading.value = true
  try {
    const { data } = await locationsApi.list()
    locations.value = data.data
  } finally {
    loading.value = false
  }
}

async function doCreate() {
  saving.value = true
  formError.value = ''
  try {
    await locationsApi.create({
      name: createForm.value.name.trim(),
      address: createForm.value.address.trim() || undefined,
    })
    createModal.value = false
    await load()
  } catch (err) {
    const msg = err.response?.data?.error
    formError.value = msg === 'DUPLICATE_LOCATION' ? 'A location with this name already exists.' : 'Failed to create location.'
  } finally {
    saving.value = false
  }
}

async function doEditAddress() {
  saving.value = true
  formError.value = ''
  try {
    await locationsApi.update(addressTarget.value.id, {
      address: addressValue.value.trim() || null,
    })
    addressModal.value = false
    await load()
  } catch (err) {
    formError.value = err.response?.data?.error === 'FORBIDDEN'
      ? 'You can only edit your own location.'
      : 'Failed to update address.'
  } finally {
    saving.value = false
  }
}

async function doDelete() {
  saving.value = true
  formError.value = ''
  try {
    await locationsApi.remove(deleteTarget.value.id)
    deleteModal.value = false
    await load()
  } catch (err) {
    const msg = err.response?.data?.error
    formError.value = msg === 'LOCATION_IN_USE'
      ? 'Cannot delete: this location has candidates, appointments, or availability records.'
      : 'Failed to delete location.'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
