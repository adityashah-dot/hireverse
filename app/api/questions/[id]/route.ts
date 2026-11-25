import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const question = await prisma.question.findFirst({
      where: {
        id,
        OR: [
          { isGlobal: true },
          { job: { companyId: user.companyId } },
        ],
      },
    })
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    await prisma.question.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete question error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
