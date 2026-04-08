import { DefaultSession, DefaultJWT } from 'next-auth'

type Role = 'ADMIN' | 'MANAGER' | 'HR'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    /** Backend-issued JWT — forwarded to the Express backend as Bearer */
    accessToken: string
    user: {
      id: string
      role: Role
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    accessToken?: string
    role?: Role
    userId?: string
  }
}
