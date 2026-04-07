'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Role = 'ADMIN' | 'MANAGER' | 'HR'

interface RoleGuardProps {
  /** Roles that are allowed to see / access this content */
  roles: Role[]
  children: ReactNode
  /**
   * When true the component acts as a *page guard*:
   *   - Shows a loading spinner while the session is resolving
   *   - Redirects unauthorised users to /unauthorized
   * When false (default) it simply hides/shows children inline.
   */
  pageGuard?: boolean
  /** Custom redirect path (page guard only). Defaults to '/unauthorized'. */
  redirectTo?: string
  /** Rendered while the session is loading (inline mode). Defaults to null. */
  fallback?: ReactNode
}

/**
 * RoleGuard — controls visibility based on the current user's session role.
 *
 * Inline usage (hides children for unauthorised roles):
 *   <RoleGuard roles={['ADMIN', 'MANAGER']}>
 *     <SensitiveButton />
 *   </RoleGuard>
 *
 * Page-level usage (redirects unauthorised users):
 *   <RoleGuard roles={['ADMIN']} pageGuard>
 *     <AdminPage />
 *   </RoleGuard>
 */
export function RoleGuard({
  roles,
  children,
  pageGuard = false,
  redirectTo = '/unauthorized',
  fallback = null,
}: RoleGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isLoading = status === 'loading'
  const userRole  = session?.user?.role as Role | undefined
  const hasAccess = !!userRole && roles.includes(userRole)

  useEffect(() => {
    if (!pageGuard) return
    if (isLoading) return
    if (!hasAccess) {
      router.replace(redirectTo)
    }
  }, [pageGuard, isLoading, hasAccess, redirectTo, router])

  // ── Page guard mode ──────────────────────────────────────────────────────────
  if (pageGuard) {
    if (isLoading || !hasAccess) {
      return (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )
    }
    return <>{children}</>
  }

  // ── Inline mode ──────────────────────────────────────────────────────────────
  if (isLoading) return <>{fallback}</>
  if (!hasAccess) return null

  return <>{children}</>
}
