import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'VIEWER']),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const members = await prisma.user.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: members })
  } catch (error) {
    console.error('Team list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { name, email, role } = inviteSchema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'User already exists' }, { status: 400 })

    const tempPassword = Math.random().toString(36).slice(-8)
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const member = await prisma.user.create({
      data: { name, email, passwordHash, role, companyId: user.companyId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    return NextResponse.json({ data: member, tempPassword }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Team invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
