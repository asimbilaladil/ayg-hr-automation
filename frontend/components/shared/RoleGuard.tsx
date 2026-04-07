'use client'

import { useSession } from 'next-auth/react'
import { Role } from '@/types'

type RoleGuardProps = {
  allowedRoles: Role[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { data: session } = useSession()
  const role = session?.user?.role as Role | undefined

  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export function useRole(): Role | undefined {
  const { data: session } = useSession()
  return session?.user?.role as Role | undefined
}

export function useIsAdmin(): boolean {
  return useRole() === 'ADMIN'
}

export function useIsManager(): boolean {
  const role = useRole()
  return role === 'MANAGER' || role === 'ADMIN'
}
