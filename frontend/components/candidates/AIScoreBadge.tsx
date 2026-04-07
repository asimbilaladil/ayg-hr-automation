'use client'

import { cn, getAIScoreBg } from '@/lib/utils'

type AIScoreBadgeProps = {
  score?: number
  size?: 'sm' | 'md' | 'lg'
}

export function AIScoreBadge({ score, size = 'sm' }: AIScoreBadgeProps) {
  if (score === undefined || score === null) {
    return <span className="text-slate-400 text-xs">—</span>
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-bold rounded-lg ring-1 ring-inset',
        getAIScoreBg(score),
        size === 'sm' && 'px-2 py-0.5 text-xs min-w-[2.5rem]',
        size === 'md' && 'px-3 py-1 text-sm min-w-[3rem]',
        size === 'lg' && 'px-4 py-1.5 text-2xl min-w-[4rem]'
      )}
    >
      {score}
    </span>
  )
}
