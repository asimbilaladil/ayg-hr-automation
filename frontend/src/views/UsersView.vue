<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">User Management</h2>
        <p class="text-sm text-gray-500 mt-0.5">Manage roles and access for your organisation</p>
      </div>
      <div v-if="auth.user?.role === 'ADMIN' || auth.user?.role === 'HR'" class="flex gap-2">
        <button class="btn-primary" @click="openCreateUser">+ Create User</button>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">User</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
              <th class="px-4 py-3 font-semibold text-gray-600 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading" v-for="i in 4" :key="i">
              <td colspan="6" class="px-4 py-3">
                <div class="animate-pulse h-4 bg-gray-100 rounded" />
              </td>
            </tr>
            <tr v-else-if="!users.length">
              <td colspan="6" class="px-4 py-12 text-center text-gray-400">No users found</td>
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
                <span v-if="u.locations && u.locations.length" class="text-sm text-gray-700">
                  {{ u.locations.map(l => l.name).join(', ') }}
                </span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>
              <td class="px-4 py-3">
                <StatusBadge :status="u.isActive ? 'active' : 'inactive'" />
              </td>
              <td class="px-4 py-3 text-xs text-gray-400">{{ formatDate(u.createdAt) }}</td>
              <td class="px-4 py-3 text-center">
                <span v-if="u.id === auth.user?.id" class="text-xs text-gray-400 italic">You</span>
                <div v-else class="relative inline-block">
                  <button
                    class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                    @click.stop="toggleMenu(u.id)"
                  >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                    </svg>
                  </button>

                  <div
                    v-if="activeMenuId === u.id"
                    class="absolute right-0 top-8 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-52"
                    @click.stop
                  >
                    <!-- Assign Location -->
                    <button
                      v-if="(auth.user?.role === 'ADMIN' || auth.user?.role === 'HR') && u.role === 'MANAGER' && (!u.locations || !u.locations.length)"
                      class="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                      @click="openAssignModal(u); activeMenuId = null"
                    >
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
                      Assign Location
                    </button>

                    <!-- Transfer Location -->
                    <button
                      v-if="(auth.user?.role === 'ADMIN' || auth.user?.role === 'HR') && u.role === 'MANAGER' && u.locations && u.locations.length"
                      class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      @click="openSwapModal(u); activeMenuId = null"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                      Transfer Location
                    </button>

                    <!-- Edit Email -->
                    <button
                      v-if="auth.user?.role === 'ADMIN' || auth.user?.role === 'HR'"
                      class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      @click="openEmailEdit(u); activeMenuId = null"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/></svg>
                      Edit Email
                    </button>

                    <!-- Reset Password -->
                    <button
                      v-if="(auth.user?.role === 'ADMIN' || auth.user?.role === 'HR') && u.isActive"
                      class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      @click="confirmReset(u); activeMenuId = null"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                      Reset Password
                    </button>

                    <!-- Change Role (Admin only) -->
                    <div v-if="auth.user?.role === 'ADMIN'" class="border-t border-gray-100 mt-1 pt-1">
                      <p class="px-4 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Change Role</p>
                      <button
                        v-for="role in ['HR', 'MANAGER', 'ADMIN'].filter(r => r !== u.role)"
                        :key="role"
                        class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        @click="changeRole(u, role); activeMenuId = null"
                      >
                        Set as {{ role === 'MANAGER' ? 'Manager' : role }}
                      </button>
                    </div>

                    <!-- Deactivate -->
                    <div v-if="auth.user?.role === 'ADMIN' && u.isActive" class="border-t border-gray-100 mt-1 pt-1">
                      <button
                        class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        @click="confirmDeactivate(u); activeMenuId = null"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                        Deactivate
                      </button>
                    </div>
                    <div v-else-if="!u.isActive" class="px-4 py-2 text-xs text-gray-400 italic">Deactivated</div>

                    <!-- Delete Manager -->
                    <div v-if="(auth.user?.role === 'ADMIN' || auth.user?.role === 'HR') && u.role === 'MANAGER'" class="border-t border-gray-100 mt-1 pt-1">
                      <button
                        class="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2 font-medium"
                        @click="confirmDeleteManager(u); activeMenuId = null"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        Delete Manager
                      </button>
                    </div>
                  </div>
                </div>
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

    <!-- ── Create User Modal ────────────────────────────────────────── -->
    <div v-if="createModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900">Create New User</h3>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Full Name <span class="text-red-500">*</span></label>
            <input v-model="createForm.name" type="text" placeholder="Jane Smith"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Email <span class="text-red-500">*</span></label>
            <input v-model="createForm.email" type="email" placeholder="jane@aygfoods.com"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Role <span class="text-red-500">*</span></label>
            <select v-model="createForm.role"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none">
              <option value="HR">HR</option>
              <option value="MANAGER">Manager</option>
              <option v-if="auth.user?.role === 'ADMIN'" value="ADMIN">Admin</option>
            </select>
          </div>

          <!-- Location field — only shown when role is MANAGER -->
          <div v-if="createForm.role === 'MANAGER'"
            class="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <p class="text-xs font-medium text-amber-800 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
              </svg>
              Managers require a location
            </p>
            <input v-model="createForm.locationName" type="text" placeholder="e.g. LCF Cypress"
              class="w-full border border-amber-200 bg-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none" />
            <p class="text-xs text-amber-600">A new location will be created and assigned to this manager.</p>
          </div>
        </div>

        <p v-if="createError" class="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{{ createError }}</p>

        <p class="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
          A temporary password will be generated automatically and shown after creation.
        </p>

        <div class="flex justify-end gap-3 pt-1">
          <button class="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
            @click="createModal = false">Cancel</button>
          <button
            class="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
            :disabled="creating || !createForm.name || !createForm.email || (createForm.role === 'MANAGER' && !createForm.locationName)"
            @click="doCreateUser">
            {{ creating ? 'Creating…' : 'Create User' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Create User Result Modal ──────────────────────────────────── -->
    <div v-if="createResultModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-gray-900">User Created</h3>
            <p class="text-sm text-gray-500">{{ createdUser?.name }} ({{ createdUser?.role }})</p>
          </div>
        </div>
        <div v-if="createdLocation" class="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
          </svg>
          Location <strong>{{ createdLocation.name }}</strong> created and assigned
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Temporary password — share this with the user:</p>
          <div class="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
            <p class="text-2xl font-mono font-bold tracking-widest text-gray-900 select-all">{{ createdTempPassword }}</p>
          </div>
        </div>
        <p class="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 border border-amber-200">
          ⚠️ This password will not be shown again. Copy it now.
        </p>
        <div class="flex justify-end gap-3 pt-1">
          <button class="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
            @click="copyCreatedPassword">{{ createdCopied ? '✓ Copied' : 'Copy' }}</button>
          <button class="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
            @click="createResultModal = false">Done</button>
        </div>
      </div>
    </div>

    <!-- ── Transfer Location Modal ──────────────────────────────────── -->
    <div v-if="swapModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-5">

        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-gray-900">Transfer Manager Locations</h3>
            <p class="text-sm text-gray-500 mt-0.5">Swap two managers between locations — all candidates, appointments and availability windows move with them.</p>
          </div>
          <button class="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" @click="closeSwapModal">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Two manager pickers -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Manager A -->
          <div class="border border-gray-200 rounded-xl p-4 space-y-3">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Manager A</p>
            <select v-model="swapAId" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none" @change="onSwapSelectionChange">
              <option value="">Select manager…</option>
              <option v-for="m in swappableManagers" :key="m.id" :value="m.id" :disabled="m.id === swapBId">
                {{ m.name }}
              </option>
            </select>
            <div v-if="swapAId">
              <p v-if="swapACurrentLocation" class="text-sm text-gray-600">
                📍 Currently at: <span class="font-medium text-gray-800">{{ swapACurrentLocation }}</span>
              </p>
              <p v-else class="text-sm text-amber-600">⚠ No location assigned</p>
            </div>
          </div>

          <!-- Manager B -->
          <div class="border border-gray-200 rounded-xl p-4 space-y-3">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Manager B</p>
            <select v-model="swapBId" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none" @change="onSwapSelectionChange">
              <option value="">Select manager…</option>
              <option v-for="m in swappableManagers" :key="m.id" :value="m.id" :disabled="m.id === swapAId">
                {{ m.name }}
              </option>
            </select>
            <div v-if="swapBId">
              <p v-if="swapBCurrentLocation" class="text-sm text-gray-600">
                📍 Currently at: <span class="font-medium text-gray-800">{{ swapBCurrentLocation }}</span>
              </p>
              <p v-else class="text-sm text-amber-600">⚠ No location assigned</p>
            </div>
          </div>
        </div>

        <!-- Preview section -->
        <div v-if="swapPreviewLoading" class="text-center py-6 text-sm text-gray-400">
          <svg class="animate-spin w-5 h-5 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading preview…
        </div>

        <div v-else-if="swapPreviewError" class="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 border border-red-200">
          {{ swapPreviewError }}
        </div>

        <div v-else-if="swapPreviewData" class="space-y-4">
          <!-- After transfer summary -->
          <div class="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p class="text-sm font-semibold text-blue-900 mb-3">After this transfer:</p>
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-sm">
                <span class="font-medium text-gray-800 w-40 truncate">{{ swapPreviewData.managerA.name }}</span>
                <span class="text-gray-400 text-xs">{{ swapPreviewData.managerA.location.name }}</span>
                <span class="text-gray-400">→</span>
                <span class="font-medium text-blue-700">{{ swapPreviewData.managerB.location.name }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <span class="font-medium text-gray-800 w-40 truncate">{{ swapPreviewData.managerB.name }}</span>
                <span class="text-gray-400 text-xs">{{ swapPreviewData.managerB.location.name }}</span>
                <span class="text-gray-400">→</span>
                <span class="font-medium text-blue-700">{{ swapPreviewData.managerA.location.name }}</span>
              </div>
            </div>
          </div>

          <!-- Record counts -->
          <div class="grid grid-cols-2 gap-4">
            <div class="border border-gray-100 rounded-xl p-4 space-y-2">
              <p class="text-xs font-semibold text-gray-500 truncate">
                {{ swapPreviewData.managerA.location.name }} → {{ swapPreviewData.managerB.name }}
              </p>
              <div class="space-y-1.5 text-sm text-gray-700">
                <p>👥 <span class="font-medium">{{ swapPreviewData.transferToB.candidates }}</span> candidates</p>
                <p>📅 <span class="font-medium">{{ swapPreviewData.transferToB.appointments }}</span> appointments</p>
                <p>🗓 <span class="font-medium">{{ swapPreviewData.transferToB.availabilityWindows }}</span> availability windows</p>
              </div>
            </div>
            <div class="border border-gray-100 rounded-xl p-4 space-y-2">
              <p class="text-xs font-semibold text-gray-500 truncate">
                {{ swapPreviewData.managerB.location.name }} → {{ swapPreviewData.managerA.name }}
              </p>
              <div class="space-y-1.5 text-sm text-gray-700">
                <p>👥 <span class="font-medium">{{ swapPreviewData.transferToA.candidates }}</span> candidates</p>
                <p>📅 <span class="font-medium">{{ swapPreviewData.transferToA.appointments }}</span> appointments</p>
                <p>🗓 <span class="font-medium">{{ swapPreviewData.transferToA.availabilityWindows }}</span> availability windows</p>
              </div>
            </div>
          </div>
        </div>

        <p v-if="swapError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{{ swapError }}</p>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            class="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
            @click="closeSwapModal"
          >Cancel</button>
          <button
            class="text-sm bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
            :disabled="!swapPreviewData || swapping"
            @click="doSwap"
          >
            {{ swapping ? 'Transferring…' : 'Confirm Transfer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Assign Location Modal ─────────────────────────────────────── -->
    <div v-if="assignModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">

        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-gray-900">Assign Location</h3>
            <p class="text-sm text-gray-500 mt-0.5">
              Assigning to <span class="font-medium text-gray-800">{{ assignTarget?.name }}</span>
            </p>
          </div>
          <button class="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" @click="assignModal = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Mode toggle -->
        <div class="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          <button
            class="flex-1 py-2 font-medium transition-colors"
            :class="assignMode === 'create' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50'"
            @click="assignMode = 'create'; assignSelectedLocationId = ''"
          >Create New Location</button>
          <button
            class="flex-1 py-2 font-medium transition-colors"
            :class="assignMode === 'existing' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50'"
            @click="assignMode = 'existing'; assignNewName = ''"
          >Use Existing Location</button>
        </div>

        <!-- Create new -->
        <div v-if="assignMode === 'create'" class="space-y-2">
          <label class="block text-xs font-medium text-gray-600">Location Name <span class="text-red-500">*</span></label>
          <input
            v-model="assignNewName"
            type="text"
            placeholder="e.g. LCF Cypress"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
          />
          <p class="text-xs text-gray-400">A new location will be created and immediately assigned to {{ assignTarget?.name }}.</p>
        </div>

        <!-- Use existing -->
        <div v-else class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Select Location <span class="text-red-500">*</span></label>
            <select
              v-model="assignSelectedLocationId"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
            >
              <option value="">Choose a location…</option>
              <option v-for="loc in allLocations" :key="loc.id" :value="loc.id">
                {{ loc.name }}{{ loc.manager ? ` (currently: ${loc.manager.name})` : ' (unmanaged)' }}
              </option>
            </select>
          </div>

          <div v-if="assignSelectedLocationId">
            <div v-if="selectedLocationHasManager" class="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
              ⚠ This location is currently owned by <strong>{{ selectedLocationManager?.name }}</strong>.
              All their candidates, appointments and availability windows at this location will transfer to
              <strong>{{ assignTarget?.name }}</strong>. The previous manager will have no location.
            </div>
            <div v-else class="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
              This location has no current manager — it will be assigned directly to {{ assignTarget?.name }}.
            </div>
          </div>
        </div>

        <p v-if="assignError" class="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{{ assignError }}</p>

        <div class="flex justify-end gap-3 pt-1 border-t border-gray-100">
          <button
            class="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
            @click="assignModal = false"
          >Cancel</button>
          <button
            class="text-sm bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
            :disabled="assigning || (assignMode === 'create' ? !assignNewName.trim() : !assignSelectedLocationId)"
            @click="doAssignLocation"
          >
            {{ assigning ? 'Assigning…' : 'Assign Location' }}
          </button>
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

    <!-- ── Delete Manager modal ──────────────────────────────────────── -->
    <div v-if="deleteManagerModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-gray-900">Delete Manager</h3>
            <p class="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>

        <div class="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2 text-sm text-red-800">
          <p class="font-medium">Deleting <span class="font-bold">{{ deleteManagerTarget?.name }}</span> will:</p>
          <ul class="space-y-1 ml-1">
            <li class="flex items-start gap-2">
              <span class="mt-0.5 text-red-500">•</span>
              <span>
                Unlink location
                <strong>{{ deleteManagerTarget?.locations?.[0]?.name || '(none)' }}</strong>
                — it stays in the system but has no manager
              </span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-0.5 text-red-500">•</span>
              <span>Unassign all candidates linked to this manager</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-0.5 text-green-600">•</span>
              <span class="text-green-800">
                When a new manager is assigned to
                <strong>{{ deleteManagerTarget?.locations?.[0]?.name || 'that location' }}</strong>,
                all those candidates will auto-assign to them
              </span>
            </li>
          </ul>
        </div>

        <p v-if="deleteManagerError" class="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{{ deleteManagerError }}</p>

        <div class="flex justify-end gap-3 pt-1">
          <button
            class="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
            :disabled="deletingManager"
            @click="deleteManagerModal = false"
          >Cancel</button>
          <button
            class="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            :disabled="deletingManager"
            @click="doDeleteManager"
          >
            {{ deletingManager ? 'Deleting…' : 'Delete Manager' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usersApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'

const auth = useAuthStore()
const loading = ref(false)
const users = ref([])

// ── Three-dots action menu ───────────────────────────────────────────────────
const activeMenuId = ref(null)
function toggleMenu(id) {
  activeMenuId.value = activeMenuId.value === id ? null : id
}
function closeMenu() { activeMenuId.value = null }
onMounted(() => document.addEventListener('click', closeMenu))
onUnmounted(() => document.removeEventListener('click', closeMenu))

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

// ── Create user ──────────────────────────────────────────────────────────────
const createModal = ref(false)
const createResultModal = ref(false)
const creating = ref(false)
const createError = ref('')
const createdUser = ref(null)
const createdLocation = ref(null)
const createdTempPassword = ref('')
const createdCopied = ref(false)

const createForm = ref({ name: '', email: '', role: 'HR', locationName: '' })

function openCreateUser() {
  createForm.value = { name: '', email: '', role: 'HR', locationName: '' }
  createError.value = ''
  createModal.value = true
}

async function doCreateUser() {
  createError.value = ''
  creating.value = true
  try {
    const payload = {
      name: createForm.value.name,
      email: createForm.value.email,
      role: createForm.value.role,
      ...(createForm.value.role === 'MANAGER' && createForm.value.locationName
        ? { locationName: createForm.value.locationName } : {}),
    }
    const { data } = await usersApi.create(payload)
    users.value.unshift(data.user)
    createdUser.value = data.user
    createdLocation.value = data.location || null
    createdTempPassword.value = data.tempPassword
    createdCopied.value = false
    createModal.value = false
    createResultModal.value = true
  } catch (err) {
    createError.value = err.response?.data?.error || 'Failed to create user'
  } finally {
    creating.value = false
  }
}

function copyCreatedPassword() {
  navigator.clipboard.writeText(createdTempPassword.value).then(() => {
    createdCopied.value = true
    setTimeout(() => { createdCopied.value = false }, 2000)
  })
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

// ── Transfer Location (Swap) ─────────────────────────────────────────────────
const swapModal = ref(false)
const swapAId = ref('')
const swapBId = ref('')
const swapPreviewData = ref(null)
const swapPreviewLoading = ref(false)
const swapPreviewError = ref('')
const swapping = ref(false)
const swapError = ref('')

const swappableManagers = computed(() =>
  users.value.filter(u => u.role === 'MANAGER')
)

const swapACurrentLocation = computed(() => {
  if (!swapAId.value) return null
  const m = users.value.find(u => u.id === swapAId.value)
  return m?.locations?.[0]?.name || null
})

const swapBCurrentLocation = computed(() => {
  if (!swapBId.value) return null
  const m = users.value.find(u => u.id === swapBId.value)
  return m?.locations?.[0]?.name || null
})

function openSwapModal(preselect = null) {
  swapAId.value = preselect?.id || ''
  swapBId.value = ''
  swapPreviewData.value = null
  swapPreviewError.value = ''
  swapError.value = ''
  swapModal.value = true
}

function closeSwapModal() {
  swapModal.value = false
}

let swapPreviewTimer = null
function onSwapSelectionChange() {
  swapPreviewData.value = null
  swapPreviewError.value = ''
  if (!swapAId.value || !swapBId.value) return
  clearTimeout(swapPreviewTimer)
  swapPreviewTimer = setTimeout(fetchSwapPreview, 300)
}

async function fetchSwapPreview() {
  swapPreviewLoading.value = true
  swapPreviewError.value = ''
  swapPreviewData.value = null
  try {
    const { data } = await usersApi.swapPreview(swapAId.value, swapBId.value)
    swapPreviewData.value = data
  } catch (err) {
    swapPreviewError.value = err.response?.data?.error || 'Failed to load preview'
  } finally {
    swapPreviewLoading.value = false
  }
}

async function doSwap() {
  if (!swapPreviewData.value) return
  swapping.value = true
  swapError.value = ''
  try {
    await usersApi.swapLocations(swapAId.value, swapBId.value)
    swapModal.value = false
    await fetchData()
  } catch (err) {
    swapError.value = err.response?.data?.error || 'Transfer failed. Please try again.'
  } finally {
    swapping.value = false
  }
}

// ── Assign Location ──────────────────────────────────────────────────────────
const assignModal = ref(false)
const assignTarget = ref(null)
const assignMode = ref('create')
const assignNewName = ref('')
const assignSelectedLocationId = ref('')
const assignError = ref('')
const assigning = ref(false)
const allLocations = ref([])

const selectedLocationManager = computed(() => {
  if (!assignSelectedLocationId.value) return null
  const loc = allLocations.value.find(l => l.id === assignSelectedLocationId.value)
  return loc?.manager || null
})

const selectedLocationHasManager = computed(() => !!selectedLocationManager.value)

async function openAssignModal(u) {
  assignTarget.value = u
  assignMode.value = 'create'
  assignNewName.value = ''
  assignSelectedLocationId.value = ''
  assignError.value = ''
  assignModal.value = true
  try {
    const { data } = await usersApi.listLocations()
    allLocations.value = data?.data || []
  } catch (err) {
    console.error(err)
  }
}

async function doAssignLocation() {
  assignError.value = ''
  assigning.value = true
  try {
    const locationName = assignMode.value === 'create' ? assignNewName.value.trim() : undefined
    const locationId = assignMode.value === 'existing' ? assignSelectedLocationId.value : undefined
    await usersApi.assignLocation(assignTarget.value.id, locationName, locationId)
    assignModal.value = false
    await fetchData()
  } catch (err) {
    assignError.value = err.response?.data?.error || 'Failed to assign location'
  } finally {
    assigning.value = false
  }
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

// ── Delete Manager ────────────────────────────────────────────────────────────
const deleteManagerModal = ref(false)
const deleteManagerTarget = ref(null)
const deletingManager = ref(false)
const deleteManagerError = ref('')

function confirmDeleteManager(u) {
  deleteManagerTarget.value = u
  deleteManagerError.value = ''
  deleteManagerModal.value = true
}

async function doDeleteManager() {
  deletingManager.value = true
  deleteManagerError.value = ''
  try {
    await usersApi.deleteManager(deleteManagerTarget.value.id)
    users.value = users.value.filter(u => u.id !== deleteManagerTarget.value.id)
    deleteManagerModal.value = false
  } catch (err) {
    deleteManagerError.value = err.response?.data?.error || 'Failed to delete manager'
  } finally {
    deletingManager.value = false
  }
}

onMounted(fetchData)
</script>
