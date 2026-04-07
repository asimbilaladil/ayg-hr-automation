'use client'

import { Search, X, SlidersHorizontal } from 'lucide-react'
import { CandidateFilters as CandidateFiltersType } from '@/types'
import { useCandidateLocations, useCandidatePostings } from '@/hooks/useCandidates'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  filters: CandidateFiltersType
  onChange: (filters: CandidateFiltersType) => void
  onClear: () => void
}

export function CandidateFilters({ filters, onChange, onClear }: Props) {
  const { data: locations = [] } = useCandidateLocations()
  const { data: postings = [] } = useCandidatePostings()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => k !== 'page' && k !== 'limit' && v && v !== ''
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={filters.search ?? ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status ?? ''}
          onChange={(e) => onChange({ ...filters, status: e.target.value as CandidateFiltersType['status'], page: 1 })}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 min-w-[140px]"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="called">Called</option>
          <option value="not_found">Not Found</option>
          <option value="processed_no_resume">No Resume</option>
        </select>

        {/* AI Recommendation */}
        <select
          value={filters.aiRecommendation ?? ''}
          onChange={(e) => onChange({ ...filters, aiRecommendation: e.target.value as CandidateFiltersType['aiRecommendation'], page: 1 })}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 min-w-[160px]"
        >
          <option value="">All Recommendations</option>
          <option value="ACCEPT">Accept</option>
          <option value="MAYBE">Maybe</option>
          <option value="REJECT">Reject</option>
        </select>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors',
            showAdvanced
              ? 'border-blue-400 bg-blue-50 text-blue-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>

        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100">
          {/* Location */}
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

          {/* Posting */}
          <select
            value={filters.postingName ?? ''}
            onChange={(e) => onChange({ ...filters, postingName: e.target.value, page: 1 })}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 min-w-[200px]"
          >
            <option value="">All Postings</option>
            {postings.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">From</label>
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value, page: 1 })}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <label className="text-xs text-slate-500">To</label>
            <input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value, page: 1 })}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
        </div>
      )}
    </div>
  )
}
