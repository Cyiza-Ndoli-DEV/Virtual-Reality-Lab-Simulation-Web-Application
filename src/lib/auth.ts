import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import prisma from './prisma'
import { accessFlagsForRoleCode } from './role-portal-access'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8, // 8 hours
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            subjectId: true,
          },
        })

        if (!user) {
          throw new Error('No user found with this email')
        }

        const passwordMatch = await compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) {
          throw new Error('Incorrect password')
        }

        const portals = await accessFlagsForRoleCode(user.role)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subjectId: user.subjectId,
          ...portals,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.subjectId = user.subjectId ?? null
        token.canAccessAdmin = user.canAccessAdmin ?? false
        token.canAccessTeacher = user.canAccessTeacher ?? false
        token.canAccessStudent = user.canAccessStudent ?? false
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
      }
      return session
    },
  },
})
