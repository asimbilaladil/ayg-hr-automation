import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ring-1 ring-inset',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-700 ring-slate-200',
        secondary: 'bg-slate-100 text-slate-600 ring-slate-200',
        destructive: 'bg-red-50 text-red-700 ring-red-200',
        outline: 'text-slate-700 ring-slate-200',
        success: 'bg-green-50 text-green-700 ring-green-200',
        warning: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
