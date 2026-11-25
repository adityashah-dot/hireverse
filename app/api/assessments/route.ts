import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const jobId = searchParams.get('jobId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {
      candidate: { job: { companyId: user.companyId } },
    }
    if (status) where.status = status
    if (jobId) where.candidate = { ...where.candidate, jobId }

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              email: true,
              stage: true,
              job: { select: { id: true, title: true } },
            },
          },
          responses: { select: { id: true, isCorrect: true, timeTaken: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.assessment.count({ where }),
    ])

    return NextResponse.json({
      data: assessments,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('List assessments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
