'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle } from 'lucide-react'

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isAccessDenied = error === 'AccessDenied' || error === 'Signin'
  const orgDomain = process.env.NEXT_PUBLIC_ORG_DOMAIN ?? 'company.com'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.ok) {
      router.push('/dashboard')
      // keep loading=true while redirecting
      return
    }

    setLoading(false)

    if (result?.error === 'AccessDenied') {
      setFormError(`Access restricted to @${orgDomain} email addresses.`)
    } else {
      setFormError('Invalid email or password. Please try again.')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      {/* Subtle dot-grid background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-sm">
        <Card className="shadow-xl border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-4 text-center">
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
            {/* URL-level error (e.g. redirect back from NextAuth) */}
            {isAccessDenied && !formError && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Access Denied</strong> — Only{' '}
                  <span className="font-mono font-semibold">@{orgDomain}</span>{' '}
                  email addresses are permitted.
                </AlertDescription>
              </Alert>
            )}

            {/* Form-level error */}
            {formError && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{formError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={`you@${orgDomain}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 font-medium text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              Access is restricted to authorised personnel only.
              <br />
              Contact your administrator if you need access.
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
