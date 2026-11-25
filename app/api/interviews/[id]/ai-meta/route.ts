import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/interviews/[id]/ai-meta
 * Returns the metadata needed by the AI interview start page.
 * Public route — called by the candidate's browser.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            name: true,
            email: true,
            id: true,
            job: { select: { title: true } },
          },
        },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(interview.status)) {
      return NextResponse.json({ error: 'This interview session is no longer active.' }, { status: 410 })
    }

    // Strict access window: scheduled time +/- 10 minutes.
    const now = new Date()
    const scheduledAt = new Date(interview.scheduledAt)
    const windowMs = 10 * 60 * 1000
    const earliestAccess = new Date(scheduledAt.getTime() - windowMs)
    const latestAccess = new Date(scheduledAt.getTime() + windowMs)

    if (now < earliestAccess || now > latestAccess) {
      return NextResponse.json(
        {
          error: 'Interview link can only be accessed from 10 minutes before to 10 minutes after the scheduled time.',
          accessWindowStart: earliestAccess.toISOString(),
          accessWindowEnd: latestAccess.toISOString(),
          scheduledAt: scheduledAt.toISOString(),
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      interviewId: interview.id,
      candidateName: interview.candidate.name,
      candidateEmail: interview.candidate.email,
      position: interview.candidate.job.title,
      type: interview.type,
      scheduledAt: interview.scheduledAt.toISOString(),
      duration: interview.duration,
    })
  } catch (error: any) {
    console.error('Failed to fetch interview meta:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
