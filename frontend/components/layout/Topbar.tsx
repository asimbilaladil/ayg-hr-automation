'use client'

import { usePathname } from 'next/navigation'
import { Bell, ChevronRight } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRole } from '@/components/shared/RoleGuard'
import { cn } from '@/lib/utils'
import { Role } from '@/types'

const pageLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  candidates: 'Candidates',
  appointments: 'Appointments',
  availability: 'Availability',
  users: 'User Management',
}

const roleBadge: Record<Role, string> = {
  ADMIN: 'bg-red-50 text-red-700 ring-red-200',
  MANAGER: 'bg-blue-50 text-blue-700 ring-blue-200',
  HR: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

export function Topbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = useRole()

  const segments = pathname.split('/').filter(Boolean)
  const crumbs = segments.map((seg, i) => ({
    label: pageLabels[seg] ?? seg.replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }))

  const pageTitle = crumbs[crumbs.length - 1]?.label ?? 'Dashboard'

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
          <span>Home</span>
          {crumbs.map((c) => (
            <span key={c.href} className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3" />
              <span className={cn(c.isLast ? 'text-slate-700 font-medium' : 'text-slate-400')}>
                {c.label}
              </span>
            </span>
          ))}
        </div>
        <h1 className="text-base font-semibold text-slate-900">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
            <span className="text-[11px] font-bold text-white">
              {session?.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-medium text-slate-900 leading-none mb-0.5">
              {session?.user?.name}
            </div>
            {role && (
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full ring-1 ring-inset uppercase tracking-wide', roleBadge[role])}>
                {role}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
