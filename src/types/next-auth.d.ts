import { DefaultSession } from 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    canAccessAdmin?: boolean
    canAccessTeacher?: boolean
    canAccessStudent?: boolean
  }
}

declare module 'next-auth' {
  interface User {
    canAccessAdmin?: boolean
    canAccessTeacher?: boolean
    canAccessStudent?: boolean
  }

  interface Session {
    user: {
      id: string
      role: string
      canAccessAdmin: boolean
      canAccessTeacher: boolean
      canAccessStudent: boolean
    } & DefaultSession['user']
  }
}
