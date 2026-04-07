import { auth } from './app/api/auth/[...nextauth]/route'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  const isLoginPage   = pathname.startsWith('/login')
  const isApiAuth     = pathname.startsWith('/api/auth')
  const isPublicAsset = pathname.startsWith('/_next') || pathname === '/favicon.ico'

  // Always allow Next.js internals and NextAuth API routes
  if (isPublicAsset || isApiAuth) return NextResponse.next()

  // Unauthenticated → redirect to login
  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Already authenticated → skip login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
