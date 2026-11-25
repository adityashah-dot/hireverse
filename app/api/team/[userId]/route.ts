import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  role: z.enum(['ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'VIEWER']).optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    let data: z.infer<typeof updateSchema>
    try {
      data = updateSchema.parse(body)
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
      }
      throw e
    }

    const target = await prisma.user.findFirst({
      where: { id: userId, companyId: user.companyId },
    })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Update team member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
    }

    const target = await prisma.user.findFirst({
      where: { id: userId, companyId: user.companyId },
    })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await prisma.user.delete({ where: { id: userId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete team member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
