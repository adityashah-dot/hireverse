import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { queueEmail } from '@/lib/queue'

const WEBHOOK_SECRET = process.env.AI_INTERVIEW_WEBHOOK_SECRET || 'ai-interview-secret-change-me'

/**
 * Webhook called by Python AI service when interview completes.
 * Saves results into HireVerse Prisma DB:
 *   - Creates / updates AIInterviewSession
 *   - Updates Interview status → COMPLETED
 *   - Updates Candidate stage → INTERVIEW (if not already more advanced)
 */
export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret
    const secret = request.headers.get('x-webhook-secret')
    if (secret !== WEBHOOK_SECRET) {
      console.warn('[AI Interview Webhook] Invalid secret attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[AI Interview Webhook] Received results for session:', body.session_id)

    const {
      session_id: pySessionId,
      hireverse_interview_id: interviewId,
      candidate_info,
      position,
      start_time,
      end_time,
      final_results,
      question_breakdown,
      proctoring,
    } = body

    const transcripts = question_breakdown ?? null
    const violations = proctoring?.violations ?? null
    const attentionScore = proctoring?.attention_score ?? null

    if (!interviewId) {
      // No HireVerse interview ID — just save locally and return
      console.warn('[AI Interview Webhook] No hireverse_interview_id — cannot link to DB')
      return NextResponse.json({ status: 'saved_locally', session_id: pySessionId })
    }

    // Upsert AIInterviewSession using raw SQL to avoid Prisma camelCase type generation bugs
    await prisma.$executeRaw`
      INSERT INTO "AIInterviewSession" (
        "id", "pySessionId", "interviewId", "candidateName", "candidateEmail", "position",
        "finalScore", "passRate", "overallStatus", "questionsAnswered", "questionsPassed",
        "attentionScore", "transcripts", "violations", "status", "startedAt", "completedAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${pySessionId}, ${interviewId}, ${candidate_info?.name ?? 'Unknown'},
        ${candidate_info?.email ?? ''}, ${position ?? 'Unknown'}, ${final_results?.final_score ?? null},
        ${final_results?.pass_rate ?? null}, ${final_results?.overall_status ?? null},
        ${final_results?.questions_answered ?? 0}, ${final_results?.questions_passed ?? 0},
        ${attentionScore}, ${transcripts ? JSON.stringify(transcripts) : null}::jsonb,
        ${violations ? JSON.stringify(violations) : null}::jsonb,
        'completed',
        ${start_time ? new Date(start_time) : null}, ${end_time ? new Date(end_time) : null}, NOW()
      )
      ON CONFLICT ("pySessionId") DO UPDATE SET
        "finalScore" = EXCLUDED."finalScore",
        "passRate" = EXCLUDED."passRate",
        "overallStatus" = EXCLUDED."overallStatus",
        "questionsAnswered" = EXCLUDED."questionsAnswered",
        "questionsPassed" = EXCLUDED."questionsPassed",
        "attentionScore" = EXCLUDED."attentionScore",
        "transcripts" = EXCLUDED."transcripts",
        "violations" = EXCLUDED."violations",
        "status" = EXCLUDED."status",
        "completedAt" = EXCLUDED."completedAt",
        "updatedAt" = NOW();
    `

    // Update Interview status to COMPLETED
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'COMPLETED',
        notes: `AI Interview completed. Score: ${final_results?.final_score?.toFixed(1) ?? 'N/A'}/100 (${final_results?.overall_status ?? 'N/A'})`,
      },
    })

    // Get interview to find candidate info
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        candidateId: true,
        title: true,
        candidate: { select: { stage: true, name: true, email: true } },
      },
    })

    // Advance candidate stage: OFFER if pass_rate >= threshold, else INTERVIEW
    const PASS_THRESHOLD = Number(process.env.AI_INTERVIEW_PASS_THRESHOLD ?? 60)
    const passed = (final_results?.pass_rate ?? 0) >= PASS_THRESHOLD
    const nextStage = passed ? 'OFFER' : 'INTERVIEW'

    if (interview?.candidateId) {
      const currentStage = interview.candidate.stage as string
      const advanceable = ['APPLIED', 'SCREENING', 'SHORTLISTED', 'ASSESSMENT_SENT', 'ASSESSMENT_DONE', 'INTERVIEW']
      if (advanceable.includes(currentStage)) {
        await prisma.candidate.update({
          where: { id: interview.candidateId },
          data: { stage: nextStage },
        })
      }

      // Queue interview-completed notification email to recruiter
      await queueEmail('assessment-completed', {
        to: candidate_info?.email ?? interview.candidate.email,
        recruiterName: 'Hiring Team',
        candidateName: candidate_info?.name ?? interview.candidate.name,
        jobTitle: interview.title,
        score: final_results?.final_score ?? 0,
        passed,
        resultsUrl: `${process.env.NEXTAUTH_URL}/dashboard/interviews/${interviewId}`,
      })
    }

    console.log(`✅ [AI Interview Webhook] Saved results for interview ${interviewId}, score: ${final_results?.final_score}, stage: ${nextStage}`)

    return NextResponse.json({
      status: 'success',
      session_id: pySessionId,
      final_score: final_results?.final_score,
      candidate_stage: nextStage,
    })

  } catch (error: any) {
    console.error('[AI Interview Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save results', details: error.message },
      { status: 500 }
    )
  }
}
