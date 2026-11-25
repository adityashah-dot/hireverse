import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { withRateLimit } from '@/lib/rate-limit'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  companyName: z.string().min(2, 'Company name is required'),
})

async function handler(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, companyName } = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36)

    const company = await prisma.company.create({
      data: {
        name: companyName,
        slug,
        settings: {
          create: {},
        },
      },
    })

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'ADMIN',
        companyId: company.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user, company: { id: company.id, name: company.name } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const POST = withRateLimit(
  { maxRequests: 10, windowMs: 15 * 60 * 1000, identifier: 'register' },
  handler
)
