'use client'

import { cn } from '@/lib/utils'
import { CandidateStatus, AIRecommendation } from '@/types'

const statusConfig: Record<
  CandidateStatus | AIRecommendation | 'active' | 'inactive',
  { label: string; className: string }
> = {
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  reviewed: { label: 'Reviewed', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  called: { label: 'Called', className: 'bg-purple-50 text-purple-700 ring-purple-200' },
  not_found: { label: 'Not Found', className: 'bg-gray-100 text-gray-500 ring-gray-200' },
  processed_no_resume: { label: 'No Resume', className: 'bg-orange-50 text-orange-600 ring-orange-200' },
  ACCEPT: { label: 'Accept', className: 'bg-green-50 text-green-700 ring-green-200' },
  MAYBE: { label: 'Maybe', className: 'bg-yellow-50 text-yellow-700 ring-yellow-200' },
  REJECT: { label: 'Reject', className: 'bg-red-50 text-red-700 ring-red-200' },
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-500 ring-gray-200' },
}

type StatusBadgeProps = {
  status: CandidateStatus | AIRecommendation | 'active' | 'inactive' | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig]
  if (!config) {
    return (
      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset bg-gray-100 text-gray-600 ring-gray-200', className)}>
        {status}
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
