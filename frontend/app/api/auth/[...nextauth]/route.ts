import NextAuth from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'

const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      tenantId: process.env.AZURE_TENANT_ID!,
      authorization: {
        params: {
          scope: 'openid profile email offline_access',
        },
      },
    }),
  ],

  callbacks: {
    /** Block anyone outside the org domain before a session is created. */
    async signIn({ profile }) {
      const email = (profile?.email as string) || ''
      const orgDomain = process.env.ORG_EMAIL_DOMAIN!
      return email.endsWith(`@${orgDomain}`)
    },

    /** Enrich the JWT with the user's DB role on first sign-in. */
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token

        try {
          const res = await fetch(`${process.env.BACKEND_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${account.access_token}` },
          })
          if (res.ok) {
            const data = await res.json()
            token.role = data.user?.role
            token.userId = data.user?.id
          }
        } catch {
          // Non-fatal — role will be undefined; middleware will reject access
        }
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
})

export { auth, signIn, signOut }
export const { GET, POST } = handlers
