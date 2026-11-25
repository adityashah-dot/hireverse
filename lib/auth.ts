import { getServerSession, type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export type SessionUser = {
  id: string
  email: string
  name: string
  role: string
  companyId: string
  companyName: string
  avatar?: string
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { company: true },
        })

        if (!user) {
          throw new Error('No user found with this email')
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) {
          throw new Error('Invalid password')
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          companyName: user.company.name,
          avatar: user.avatar,
        }
      },
    }),
    // Google OAuth — enable by setting GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // GitHub OAuth — enable by setting GITHUB_ID and GITHUB_SECRET
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For OAuth logins (non-credentials), create user if they don't exist
      if (account?.provider !== 'credentials' && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { company: true },
        })

        if (existingUser) {
          // Link the OAuth account to existing user
          user.id = existingUser.id
          user.role = existingUser.role
          user.companyId = existingUser.companyId
          ;(user as any).companyName = existingUser.company.name

          await prisma.user.update({
            where: { id: existingUser.id },
            data: { lastLoginAt: new Date() },
          })
          return true
        }

        // Auto-provision: create a personal company for the OAuth user
        const company = await prisma.company.create({
          data: {
            name: user.name || user.email.split('@')[0],
            slug: user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-'),
          },
        })

        const newUser = await prisma.user.create({
          data: {
            email: user.email,
            name: user.name || '',
            passwordHash: '', // OAuth users have no password
            role: 'RECRUITER',
            companyId: company.id,
            avatar: user.image,
          },
        })

        user.id = newUser.id
        user.role = newUser.role
        ;(user as any).companyId = company.id
        ;(user as any).companyName = company.name
        return true
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as import('next-auth').User
        token.id = u.id
        token.role = u.role
        token.companyId = u.companyId
        token.companyName = u.companyName
        token.avatar = u.avatar
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.companyId = token.companyId as string
        session.user.companyName = token.companyName as string
        session.user.avatar = token.avatar as string
      }
      return session
    },
  },
  pages: {
    signIn: '/sign-in',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Returns the session user — no DB round-trip. All required fields (id, role,
// companyId) are embedded in the JWT so every API call stays fast.
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return session.user
}

export async function getSession() {
  return await getServerSession(authOptions)
}

export function withAuth(
  handler: (req: NextRequest, context: any, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: any) => {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return handler(req, context, session.user)
  }
}

export function withRole(
  roles: string[],
  handler: (req: NextRequest, context: any, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: any) => {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!roles.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return handler(req, context, session.user)
  }
}
