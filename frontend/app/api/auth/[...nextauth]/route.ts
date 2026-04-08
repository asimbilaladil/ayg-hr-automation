import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const res = await fetch(`${process.env.BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!res.ok) return null

          const data = await res.json()

          // Return user object — these fields land in the JWT callback
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            accessToken: data.token,
          }
        } catch {
          return null
        }
      },
    }),
  ],

  callbacks: {
    /** Store backend JWT + user metadata in the NextAuth JWT on first sign-in. */
    async jwt({ token, user }) {
      if (user) {
        // `user` is only populated on the initial sign-in
        token.accessToken = (user as any).accessToken
        token.role = (user as any).role
        token.userId = user.id
      }
      return token
    },

    /** Expose role, userId, and accessToken on the client-side session object. */
    async session({ session, token }) {
      session.user.role = token.role as string
      session.user.id = token.userId as string
      session.accessToken = token.accessToken as string
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours — matches backend token TTL
  },
})

export { auth, signIn, signOut }
export const { GET, POST } = handlers
