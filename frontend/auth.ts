import NextAuth from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      issuer: "https://login.microsoftonline.com/common/v2.0",
      client: {
       token_endpoint_auth_method: "client_secret_post",
      },    
}),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = (profile?.email as string) || ''
      return email.endsWith(`@${process.env.ORG_EMAIL_DOMAIN}`)
    },
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token
//        try {
//          const res = await fetch(`${process.env.BACKEND_URL}/api/auth/me`, {
//            headers: { Authorization: `Bearer ${account.access_token}` },
//          })
//          if (res.ok) {
//            const data = await res.json()
//            token.role = data.user?.role
//            token.userId = data.user?.id
//          }
//        } catch {}
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role as 'ADMIN' | 'MANAGER' | 'HR'
      session.user.id = token.userId as string
      session.accessToken = token.accessToken as string
      return session
    },
  },
  pages: { signIn: '/login', error: '/login' },
})
