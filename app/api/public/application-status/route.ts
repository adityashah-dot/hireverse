import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const applicationCode = searchParams.get('code')

    if (!email || !applicationCode) {
      return NextResponse.json({ error: 'Email and application code are required' }, { status: 400 })
    }

    const candidate = await prisma.candidate.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        job: { applicationCode },
      },
      select: {
        id: true,
        name: true,
        email: true,
        stage: true,
        skillMatch: true,
        createdAt: true,
        job: {
          select: {
            title: true,
            department: true,
            location: true,
            company: { select: { name: true, logo: true } },
          },
        },
        assessments: {
          select: { score: true, completedAt: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        notes: {
          where: { isPrivate: false },
          select: { content: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!candidate) {
      return NextResponse.json({ error: 'No application found. Please check your email and application code.' }, { status: 404 })
    }

    const stageMessages: Record<string, string> = {
      APPLIED: 'Your application has been received and is under review.',
      SCREENING: 'Your application is being screened by our team.',
      SHORTLISTED: "Great news! You've been shortlisted for the next stage.",
      ASSESSMENT_SENT: 'An assessment has been sent to your email. Please check your inbox.',
      ASSESSMENT_DONE: 'Your assessment has been received. We are reviewing your results.',
      INTERVIEW: 'You have been invited for an interview. Check your email for details.',
      OFFER: "Congratulations! You'll receive an offer letter soon.",
      HIRED: 'Welcome aboard! You have been hired.',
      REJECTED: 'Thank you for your interest. This position has been filled.',
    }

    return NextResponse.json({
      data: {
        name: candidate.name,
        position: candidate.job.title,
        company: candidate.job.company.name,
        department: candidate.job.department,
        location: candidate.job.location,
        stage: candidate.stage,
        stageMessage: stageMessages[candidate.stage] || 'Your application is being processed.',
        appliedAt: candidate.createdAt,
        skillMatch: candidate.skillMatch,
        latestAssessmentScore: candidate.assessments[0]?.score ?? null,
        latestAssessmentStatus: candidate.assessments[0]?.status ?? null,
        latestUpdate: candidate.notes[0]
          ? { message: candidate.notes[0].content, at: candidate.notes[0].createdAt }
          : null,
      },
    })
  } catch (error) {
    console.error('Application status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
