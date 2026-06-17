import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { accessFlagsForRoleCode } from './role-portal-access'
import {
  SESSION_MAX_AGE_DEFAULT,
  SESSION_MAX_AGE_REMEMBER,
} from './session-duration'
import { findUserByEmailOrUsername } from './user-lookup'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_REMEMBER,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email or username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember me', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email or username and password are required')
        }

        const user = await findUserByEmailOrUsername(credentials.email as string)

        if (!user) {
          throw new Error('No user found with this email or username')
        }

        const passwordMatch = await compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) {
          throw new Error('Incorrect password')
        }

        const portals = await accessFlagsForRoleCode(user.role)
        const rememberMe = credentials.rememberMe === 'true'

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subjectId: user.subjectId,
          mustChangePassword: user.mustChangePassword,
          rememberMe,
          ...portals,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.subjectId = user.subjectId ?? null
        token.canAccessAdmin = user.canAccessAdmin ?? false
        token.canAccessTeacher = user.canAccessTeacher ?? false
        token.canAccessStudent = user.canAccessStudent ?? false
        token.mustChangePassword = user.mustChangePassword ?? false

        const maxAge = user.rememberMe
          ? SESSION_MAX_AGE_REMEMBER
          : SESSION_MAX_AGE_DEFAULT
        token.exp = Math.floor(Date.now() / 1000) + maxAge
      }

      if (trigger === 'update' && session?.mustChangePassword === false) {
        token.mustChangePassword = false
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.subjectId = (token.subjectId as string | null) ?? null
        session.user.canAccessAdmin = Boolean(token.canAccessAdmin)
        session.user.canAccessTeacher = Boolean(token.canAccessTeacher)
        session.user.canAccessStudent = Boolean(token.canAccessStudent)
        session.user.mustChangePassword = Boolean(token.mustChangePassword)
      }
      return session
    },
  },
})
