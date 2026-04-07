'use client'

import { Search, X } from 'lucide-react'
import { AppointmentFilters as FilterType } from '@/types'
import { useAppointmentLocations, useAppointmentManagers } from '@/hooks/useAppointments'

type Props = {
  filters: FilterType
  onChange: (f: FilterType) => void
  onClear: () => void
}

export function AppointmentFilters({ filters, onChange, onClear }: Props) {
  const { data: locations = [] } = useAppointmentLocations()
  const { data: managers = [] } = useAppointmentManagers()

  const hasFilters = Object.entries(filters).some(
    ([k, v]) => k !== 'page' && k !== 'limit' && v && v !== ''
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Date</label>
          <input
            type="date"
            value={filters.date ?? ''}
            onChange={(e) => onChange({ ...filters, date: e.target.value, page: 1 })}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        <select
          value={filters.location ?? ''}
          onChange={(e) => onChange({ ...filters, location: e.target.value, page: 1 })}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 min-w-[160px]"
        >
          <option value="">All Locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>

        <select
          value={filters.managerName ?? ''}
          onChange={(e) => onChange({ ...filters, managerName: e.target.value, page: 1 })}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 min-w-[180px]"
        >
          <option value="">All Managers</option>
          {managers.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
