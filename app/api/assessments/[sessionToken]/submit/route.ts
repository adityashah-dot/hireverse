import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { queueEmail } from '@/lib/queue'
import { withRateLimit } from '@/lib/rate-limit'
import { notifyAssessmentCompleted } from '@/lib/webhook'
import { z } from 'zod'

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedAnswer: z.number().min(0).max(3),
      timeTaken: z.number().optional(),
    })
  ),
  tabSwitchCount: z.number().optional(),
})

export const POST = withRateLimit(
  { maxRequests: 10, windowMs: 60 * 1000, identifier: 'assessment-submit' },
  handler
)

async function handler(req: NextRequest, { params }: { params: Promise<{ sessionToken: string }> }) {
  try {
    const { sessionToken } = await params
    const assessment = await prisma.assessment.findUnique({
      where: { sessionToken },
      include: {
        candidate: true,
        job: { include: { company: { include: { users: { where: { role: 'ADMIN' }, take: 1 }, settings: true } } } },
      },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    if (assessment.status === 'PREPARING') {
      return NextResponse.json({ error: 'Assessment is still being prepared' }, { status: 425 })
    }

    if (assessment.status === 'EXPIRED' || assessment.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Assessment has expired' }, { status: 410 })
    }

    if (assessment.startedAt) {
      const endsAt = new Date(assessment.startedAt.getTime() + assessment.duration * 60 * 1000)
      if (new Date() > endsAt) {
        await prisma.assessment.update({ where: { id: assessment.id }, data: { status: 'EXPIRED' } })
        return NextResponse.json({ error: 'Assessment time has expired' }, { status: 410 })
      }
    }

    const body = await req.json()
    const { answers, tabSwitchCount } = submitSchema.parse(body)

    const questionIds = answers.map((a) => a.questionId)
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, correctAnswer: true, category: true },
    })
    const questionMap = new Map(questions.map((q) => [q.id, q]))

    let totalCorrect = 0
    const topicScores: Record<string, { correct: number; total: number }> = {}
    const responseData: Array<{
      assessmentId: string
      questionId: string
      selectedAnswer: number
      isCorrect: boolean
      timeTaken: number | null
    }> = []

    for (const ans of answers) {
      const q = questionMap.get(ans.questionId)
      if (!q) continue

      const isCorrect = ans.selectedAnswer === q.correctAnswer
      if (isCorrect) totalCorrect++

      if (!topicScores[q.category]) topicScores[q.category] = { correct: 0, total: 0 }
      topicScores[q.category].total++
      if (isCorrect) topicScores[q.category].correct++

      responseData.push({
        assessmentId: assessment.id,
        questionId: ans.questionId,
        selectedAnswer: ans.selectedAnswer,
        isCorrect,
        timeTaken: ans.timeTaken ?? null,
      })
    }

    const totalAnswered = answers.length
    const score = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
    const passingScore = (assessment.job.company as any).settings?.passingScore ?? 70
    const passed = score >= passingScore

    const topicScorePercentages: Record<string, number> = {}
    for (const [topic, data] of Object.entries(topicScores)) {
      topicScorePercentages[topic] = Math.round((data.correct / data.total) * 100)
    }

    const completedAt = new Date()

    // Interactive transaction: save responses AND mark COMPLETED atomically.
    // If the assessment was already completed (race condition), updateMany returns 0
    // and we throw inside the transaction to roll back everything.
    let alreadySubmitted = false
    try {
      await prisma.$transaction(async (tx) => {
        await tx.response.createMany({ data: responseData, skipDuplicates: true })
        const { count } = await tx.assessment.updateMany({
          where: { id: assessment.id, status: { notIn: ['COMPLETED', 'EXPIRED', 'CANCELLED', 'PREPARING'] as any[] } },
          data: {
            status: 'COMPLETED',
            score,
            totalCorrect,
            topicScores: topicScorePercentages as any,
            completedAt,
            tabSwitchCount: tabSwitchCount || 0,
          },
        })
        if (count === 0) {
          alreadySubmitted = true
          throw new Error('ALREADY_SUBMITTED')
        }
        await tx.candidate.update({
          where: { id: assessment.candidateId },
          data: { stage: 'ASSESSMENT_DONE' },
        })
        await tx.activityLog.create({
          data: {
            action: 'assessment_completed',
            candidateId: assessment.candidateId,
            details: { score, totalCorrect, totalAnswered, passed } as any,
          },
        })
      })
    } catch (err) {
      if (alreadySubmitted) {
        return NextResponse.json({ error: 'Assessment already submitted' }, { status: 400 })
      }
      throw err
    }

    const adminEmail = assessment.job.company.users[0]?.email
    if (adminEmail) {
      await queueEmail('assessment-completed', {
        to: adminEmail,
        recruiterName: assessment.job.company.users[0].name,
        candidateName: assessment.candidate.name,
        jobTitle: assessment.job.title,
        score,
        passed,
        resultsUrl: `${process.env.APP_URL}/candidates/${assessment.candidateId}`,
      })
    }

    // Send results to candidate
    await queueEmail('assessment-result-candidate', {
      to: assessment.candidate.email,
      candidateName: assessment.candidate.name,
      jobTitle: assessment.job.title,
      companyName: assessment.job.company.name,
      score,
      passed,
      topicScores: topicScorePercentages,
      applicationStatusUrl: `${process.env.APP_URL || 'http://localhost:3000'}/application-status`,
    })

    notifyAssessmentCompleted({
      candidateName: assessment.candidate.name,
      jobTitle: assessment.job.title,
      score,
      passed,
      candidateId: assessment.candidateId,
    })

    return NextResponse.json({
      success: true,
      score,
      passed,
      totalCorrect,
      totalQuestions: totalAnswered,
      topicScores: topicScorePercentages,
      message: 'Assessment submitted successfully. Thank you!',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Submit assessment error:', error)
    return NextResponse.json({ error: 'Failed to submit assessment' }, { status: 500 })
  }
}
