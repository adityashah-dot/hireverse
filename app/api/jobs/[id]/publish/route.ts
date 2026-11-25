import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.job.findFirst({
      where: { id, companyId: user.companyId },
    })
    if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (existing.status === 'ACTIVE') {
      return NextResponse.json({ error: 'Job is already published' }, { status: 400 })
    }

    const job = await prisma.job.update({
      where: { id },
      data: { status: 'ACTIVE', publishedAt: new Date() },
    })

    return NextResponse.json({
      data: job,
      applyLink: `${process.env.APP_URL}/apply/${job.applicationCode}`,
    })
  } catch (error) {
    console.error('Publish job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
