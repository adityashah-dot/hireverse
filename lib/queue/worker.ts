import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { processResume } from '@/lib/ai/process-resume'
import { generateQuestions } from '@/lib/ai/generate-questions'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  sendEmail,
  assessmentInviteHtml,
  assessmentCompletedHtml,
  applicationReceivedHtml,
  assessmentResultCandidateHtml,
} from '@/lib/email'

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

new Worker(
  'resume-processing',
  async (job) => {
    logger.info('Processing resume', { candidateId: job.data.candidateId })
    await processResume(job.data.candidateId)
    logger.info('Resume processed', { candidateId: job.data.candidateId })
  },
  { connection }
)

new Worker(
  'email-sending',
  async (job) => {
    logger.info('Sending email', { jobName: job.name })

    switch (job.name) {
      case 'assessment-invite': {
        const { to, candidateName, jobTitle, companyName, assessmentUrl, duration, expiresAt, customMessage } = job.data
        await sendEmail({
          to,
          subject: `Assessment Invitation: ${jobTitle} at ${companyName}`,
          html: assessmentInviteHtml({
            candidateName,
            jobTitle,
            companyName,
            assessmentUrl,
            duration,
            expiresAt: new Date(expiresAt),
            customMessage,
          }),
        })
        break
      }

      case 'assessment-completed': {
        const { to, recruiterName, candidateName, jobTitle, score, passed, resultsUrl } = job.data
        await sendEmail({
          to,
          subject: `Assessment Completed: ${candidateName} scored ${score}%`,
          html: assessmentCompletedHtml({
            recruiterName,
            candidateName,
            jobTitle,
            score,
            passed,
            resultsUrl,
          }),
        })
        break
      }

      case 'application-received': {
        const { to, candidateName, jobTitle, companyName } = job.data
        await sendEmail({
          to,
          subject: `Application Received — ${jobTitle}`,
          html: applicationReceivedHtml({ candidateName, jobTitle, companyName }),
        })
        break
      }

      case 'assessment-result-candidate': {
        const { to, candidateName, jobTitle, companyName, score, passed, topicScores, applicationStatusUrl } = job.data
        await sendEmail({
          to,
          subject: `Assessment Results — ${jobTitle} at ${companyName}`,
          html: assessmentResultCandidateHtml({
            candidateName,
            jobTitle,
            companyName,
            score,
            passed,
            topicScores: topicScores || {},
            applicationStatusUrl: applicationStatusUrl || '',
          }),
        })
        break
      }

      default:
        logger.warn('Unknown email job', { jobName: job.name })
    }
  },
  { connection }
)

new Worker(
  'assessment-generation',
  async (job) => {
    const {
      assessmentId,
      candidateId,
      jobTitle,
      skills,
      experienceLevel,
      questionCount,
      jobId,
      difficultyMix,
      focusTopics,
      candidateContext,
      emailData,
    } = job.data

    logger.info('Generating assessment questions', { assessmentId, questionCount })

    const questions = await generateQuestions({
      jobTitle,
      skills,
      experienceLevel,
      count: questionCount,
      difficultyMix,
      focusTopics,
      candidateContext,
    })

    if (questions.length === 0) {
      throw new Error(`No questions generated for assessment ${assessmentId}`)
    }

    const savedQuestions = await prisma.$transaction(
      questions.map((q) =>
        prisma.question.create({
          data: {
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            category: q.category,
            difficulty: q.difficulty,
            jobId,
            isAiGenerated: true,
          },
        })
      )
    )

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        questionIds: savedQuestions.map((q) => q.id),
        questionCount: savedQuestions.length,
        status: 'PENDING',
      },
    })

    await sendEmail({
      to: emailData.to,
      subject: `Assessment Invitation: ${emailData.jobTitle} at ${emailData.companyName}`,
      html: assessmentInviteHtml({
        candidateName: emailData.candidateName,
        jobTitle: emailData.jobTitle,
        companyName: emailData.companyName,
        assessmentUrl: emailData.assessmentUrl,
        duration: emailData.duration,
        expiresAt: new Date(emailData.expiresAt),
        customMessage: emailData.customMessage,
      }),
    })

    logger.info('Assessment ready', { assessmentId, questionCount: savedQuestions.length })
  },
  { connection }
)

logger.info('Workers started', { workers: ['resume-processing', 'email-sending', 'assessment-generation'] })
