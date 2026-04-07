'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

/** Microsoft logo SVG (official brand colours) */
function MicrosoftLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="1"  y="1"  width="9" height="9" fill="#f25022" />
      <rect x="11" y="1"  width="9" height="9" fill="#7fba00" />
      <rect x="1"  y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [loading, setLoading] = useState(false)

  const isAccessDenied = error === 'AccessDenied' || error === 'Signin'

  async function handleSignIn() {
    setLoading(true)
    await signIn('microsoft-entra-id', { callbackUrl: '/dashboard' })
    // loading stays true — user will be redirected
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      {/* Subtle dot-grid background pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-sm">
        <Card className="shadow-xl border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-4 text-center">
            {/* Logo placeholder */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 dark:bg-white shadow-md">
              <span className="text-2xl font-bold text-white dark:text-slate-900">HR</span>
            </div>

            <div>
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                HR Recruitment Platform
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Sign in with your organisation account
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {isAccessDenied && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Access Denied</strong> — Only organisation email addresses are permitted. Please use your{' '}
                  <span className="font-mono font-semibold">@{process.env.NEXT_PUBLIC_ORG_DOMAIN ?? 'company'}.com</span>{' '}
                  account.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full h-11 gap-3 font-medium text-sm text-white"
              style={{ backgroundColor: loading ? '#005a9e' : '#0078D4' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#106ebe' }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#0078D4' }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting to Microsoft…
                </>
              ) : (
                <>
                  <MicrosoftLogo />
                  Sign in with Microsoft
                </>
              )}
            </Button>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              Access is restricted to authorised personnel only.
              <br />
              Contact IT if you need access.
            </p>
          </CardContent>

          <CardFooter className="pt-0 justify-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Powered by{' '}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'AYG Foods'}
              </span>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
