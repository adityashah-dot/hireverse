import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const stageSchema = z.object({
  stage: z.enum([
    'APPLIED',
    'SCREENING',
    'SHORTLISTED',
    'ASSESSMENT_SENT',
    'ASSESSMENT_DONE',
    'INTERVIEW',
    'OFFER',
    'HIRED',
    'REJECTED',
  ]),
  reason: z.string().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { stage, reason } = stageSchema.parse(body)

    const existing = await prisma.candidate.findFirst({
      where: { id, job: { companyId: user.companyId } },
    })
    if (!existing) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    const prevStage = existing.stage

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        stage,
        rejectionReason: stage === 'REJECTED' ? reason : existing.rejectionReason,
      },
    })

    await prisma.activityLog.create({
      data: {
        action: 'stage_changed',
        candidateId: id,
        userId: user.id,
        details: { from: prevStage, to: stage, reason } as any,
      },
    })

    // Only increment totalHired on a NEW transition to HIRED, not a re-hire
    if (stage === 'HIRED' && prevStage !== 'HIRED') {
      await prisma.job.update({
        where: { id: existing.jobId },
        data: { totalHired: { increment: 1 } },
      })
    }

    (revalidateTag as any)(`dashboard-analytics-${user.companyId}`)

    return NextResponse.json({ data: candidate })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Stage update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
