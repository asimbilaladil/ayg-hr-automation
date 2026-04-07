// Re-exports from the NextAuth v5 route handler.
// This allows server components to call `auth()` directly.
export { auth, signIn, signOut } from './app/api/auth/[...nextauth]/route'
