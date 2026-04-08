'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const orgDomain = process.env.NEXT_PUBLIC_ORG_DOMAIN ?? 'company.com'
  const isAccessDenied = error === 'AccessDenied' || error === 'Signin'

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
      return
    }

    setLoading(false)
    setFormError('Invalid email or password. Please try again.')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      {/* Dot-grid background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl shadow-xl border border-slate-200 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-8 space-y-6">

          {/* Logo */}
          <div className="flex flex-col items-center space-y-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 dark:bg-white shadow-md">
              <span className="text-2xl font-bold text-white dark:text-slate-900">HR</span>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                HR Recruitment Platform
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Sign in with your organisation account
              </p>
            </div>
          </div>

          {/* Access denied banner */}
          {(isAccessDenied || formError) && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {formError ?? `Access restricted to @${orgDomain} email addresses.`}
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder={`you@${orgDomain}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Access restricted to authorised personnel only.
            <br />
            Contact your administrator if you need access.
          </p>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Powered by{' '}
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'AYG Foods'}
            </span>
          </p>
        </div>
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
