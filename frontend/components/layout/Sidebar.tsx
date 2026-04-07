'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Clock,
  UserCog,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useRole } from '@/components/shared/RoleGuard'
import { Role } from '@/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'HR'] as Role[] },
  { href: '/candidates', label: 'Candidates', icon: Users, roles: ['ADMIN', 'MANAGER', 'HR'] as Role[] },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays, roles: ['ADMIN', 'MANAGER', 'HR'] as Role[] },
  { href: '/availability', label: 'Availability', icon: Clock, roles: ['ADMIN', 'MANAGER'] as Role[] },
  { href: '/users', label: 'User Management', icon: UserCog, roles: ['ADMIN'] as Role[] },
]

const roleBadge: Record<Role, string> = {
  ADMIN: 'bg-red-500/20 text-red-300',
  MANAGER: 'bg-blue-500/20 text-blue-300',
  HR: 'bg-emerald-500/20 text-emerald-300',
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = useRole()
  const [mobileOpen, setMobileOpen] = useState(false)

  const filteredNav = navItems.filter(
    (item) => !role || item.roles.includes(role)
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">TalentFlow</div>
            <div className="text-slate-400 text-xs">Recruitment System</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-blue-500/20 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              {item.label}
              {isActive && (
                <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {session?.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">
              {session?.user?.name ?? 'Unknown'}
            </div>
            <div className="text-slate-400 text-xs truncate">
              {session?.user?.email}
            </div>
          </div>
          {role && (
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide', roleBadge[role])}>
              {role}
            </span>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-64 bg-[#0F172A] fixed inset-y-0 left-0 z-30 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#0F172A] text-white"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="pt-16">
          <SidebarContent />
        </div>
      </aside>
    </>
  )
}
