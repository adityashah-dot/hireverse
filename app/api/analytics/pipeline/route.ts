import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    const where: any = { job: { companyId: user.companyId }, isArchived: false }
    if (jobId) where.jobId = jobId

    const [stageBreakdown, sourceBreakdown, avgSkillMatch] = await Promise.all([
      prisma.candidate.groupBy({
        by: ['stage'],
        where,
        _count: true,
      }),
      prisma.candidate.groupBy({
        by: ['source'],
        where,
        _count: true,
      }),
      prisma.candidate.aggregate({
        where: { ...where, skillMatch: { not: null } },
        _avg: { skillMatch: true },
      }),
    ])

    return NextResponse.json({
      data: {
        stageBreakdown: stageBreakdown.map((s) => ({
          stage: s.stage,
          count: s._count,
        })),
        sourceBreakdown: sourceBreakdown.map((s) => ({
          source: s.source || 'unknown',
          count: s._count,
        })),
        avgSkillMatch: Math.round(avgSkillMatch._avg.skillMatch || 0),
      },
    })
  } catch (error) {
    console.error('Pipeline analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
