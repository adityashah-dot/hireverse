import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const logs = await prisma.activityLog.findMany({
      where: {
        candidate: { job: { companyId: user.companyId } },
      },
      include: {
        candidate: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ data: logs })
  } catch (error) {
    console.error('Activity log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
