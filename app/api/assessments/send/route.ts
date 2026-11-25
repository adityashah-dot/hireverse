import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { queueAssessmentGeneration } from '@/lib/queue'
import { z } from 'zod'
import crypto from 'crypto'

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

const sendAssessmentSchema = z.object({
  candidateId: z.string(),
  questionCount: z.number().min(5).max(50).optional(),
  duration: z.number().min(10).max(180).optional(),
  expiresInHours: z.number().min(1).max(168).optional(),
  customMessage: z.string().optional(),
  difficultyMix: z.object({
    easy: z.number(),
    medium: z.number(),
    hard: z.number(),
  }).optional(),
  focusTopics: z.array(z.string()).optional(),
  useCandidateContext: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      candidateId,
      questionCount = 20,
      duration = 60,
      expiresInHours = 24,
      customMessage,
      difficultyMix,
      focusTopics,
      useCandidateContext,
    } = sendAssessmentSchema.parse(body)

    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, job: { companyId: user.companyId } },
      include: { job: { include: { company: true } } },
    })
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    const pendingAssessment = await prisma.assessment.findFirst({
      where: {
        candidateId,
        status: { in: ['PREPARING', 'PENDING', 'IN_PROGRESS'] as any[] },
      },
    })
    if (pendingAssessment) {
      return NextResponse.json(
        { error: 'Candidate already has a pending assessment' },
        { status: 400 }
      )
    }

    // Build candidate context for AI-personalized questions
    const candidateContext = useCandidateContext
      ? {
          matchingSkills: (candidate as any).matchingSkills || [],
          missingSkills: (candidate as any).missingSkills || [],
          yearsExperience: (candidate as any).resumeParsed?.totalYearsExperience,
        }
      : undefined

    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

    // Create assessment immediately with PREPARING status so we have the URL right away.
    // Question generation is offloaded to the BullMQ worker.
    const assessment = await prisma.assessment.create({
      data: {
        sessionToken: generateSessionToken(),
        candidateId,
        jobId: candidate.jobId,
        questionIds: [],
        questionCount,
        duration,
        expiresAt,
        status: 'PREPARING' as any,
      },
    })

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { stage: 'ASSESSMENT_SENT' },
    })

    const assessmentUrl = `${process.env.APP_URL}/assessment/${assessment.sessionToken}`

    await queueAssessmentGeneration({
      assessmentId: assessment.id,
      candidateId,
      jobTitle: candidate.job.title,
      skills: candidate.job.skills,
      experienceLevel: candidate.job.experienceLevel,
      questionCount,
      jobId: candidate.jobId,
      difficultyMix,
      focusTopics,
      candidateContext,
      emailData: {
        to: candidate.email,
        candidateName: candidate.name,
        jobTitle: candidate.job.title,
        companyName: candidate.job.company.name,
        assessmentUrl,
        duration,
        expiresAt: expiresAt.toISOString(),
        customMessage,
      },
    })

    await prisma.activityLog.create({
      data: {
        action: 'assessment_sent',
        candidateId,
        userId: user.id,
        details: { assessmentId: assessment.id, expiresAt, questionCount } as any,
      },
    })

    return NextResponse.json({
      success: true,
      assessmentId: assessment.id,
      sessionToken: assessment.sessionToken,
      assessmentUrl,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Send assessment error:', error)
    return NextResponse.json({ error: 'Failed to send assessment' }, { status: 500 })
  }
}
