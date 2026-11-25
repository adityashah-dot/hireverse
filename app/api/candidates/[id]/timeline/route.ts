import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const activities = await prisma.activityLog.findMany({
      where: { candidateId: id },
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ data: activities })
  } catch (error) {
    console.error('Timeline error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
