<template>
  <span :class="['badge', colorClass]">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' }
})

const MAP = {
  pending:    { label: 'Pending',    cls: 'bg-yellow-100 text-yellow-800' },
  reviewing:  { label: 'Reviewing',  cls: 'bg-blue-100 text-blue-800' },
  reviewed:   { label: 'Reviewed',   cls: 'bg-indigo-100 text-indigo-800' },
  called:           { label: 'Called',            cls: 'bg-purple-100 text-purple-800' },
  'no-answer':      { label: 'No Answer',         cls: 'bg-orange-100 text-orange-800' },
  'interview-booked': { label: 'Interview Booked', cls: 'bg-teal-100 text-teal-800' },
  scheduled:        { label: 'Scheduled',         cls: 'bg-brand-100 text-brand-800' },
  processed:        { label: 'Processed',          cls: 'bg-gray-200 text-gray-700' },
  rejected:         { label: 'Rejected',          cls: 'bg-red-100 text-red-800' },
  hired:   { label: 'Hired',   cls: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Cancelled',  cls: 'bg-gray-100 text-gray-600' },
  active:     { label: 'Active',     cls: 'bg-green-100 text-green-800' },
  inactive:   { label: 'Inactive',   cls: 'bg-gray-100 text-gray-600' },
  HIRE:     { label: 'Hire',     cls: 'bg-green-100 text-green-800' },
  MAYBE:      { label: 'Maybe',      cls: 'bg-yellow-100 text-yellow-800' },
  REJECT:     { label: 'Reject',     cls: 'bg-red-100 text-red-800' },
  ADMIN:      { label: 'Admin',      cls: 'bg-purple-100 text-purple-800' },
  MANAGER:    { label: 'Manager',    cls: 'bg-blue-100 text-blue-800' },
  HR:         { label: 'HR',         cls: 'bg-gray-100 text-gray-700' },
}

const colorClass = computed(() => MAP[props.status]?.cls || 'bg-gray-100 text-gray-600')
const label = computed(() => MAP[props.status]?.label || props.status || '—')
</script>
