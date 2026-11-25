import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

let connection: IORedis
const warnedQueues = new Set<string>()

function warnOnce(queue: string, message: string) {
  if (!warnedQueues.has(queue)) {
    warnedQueues.add(queue)
    console.warn(message)
  }
}

try {
  connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    lazyConnect: true,
  })
  connection.on('error', (err) => {
    warnOnce('redis', `[Queue] Redis connection error (queues disabled): ${err.message}`)
  })
} catch (err) {
  warnOnce('redis', `[Queue] Failed to init Redis — background jobs disabled: ${(err as Error).message}`)
  connection = null as unknown as IORedis
}

export const resumeQueue = connection ? new Queue('resume-processing', { connection }) : null
export const emailQueue = connection ? new Queue('email-sending', { connection }) : null
export const assessmentQueue = connection ? new Queue('assessment-generation', { connection }) : null

export async function queueResumeProcessing(candidateId: string) {
  if (!resumeQueue) { warnOnce('resume', '[Queue] Resume queue unavailable'); return }
  await resumeQueue.add(
    'process-resume',
    { candidateId },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  )
}

export async function queueEmail(type: string, data: Record<string, any>) {
  if (!emailQueue) { warnOnce('email', '[Queue] Email queue unavailable'); return }
  await emailQueue.add(type, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  })
}

export interface AssessmentGenerationJob {
  assessmentId: string
  candidateId: string
  jobTitle: string
  skills: string[]
  experienceLevel: string
  questionCount: number
  jobId: string
  difficultyMix?: { easy: number; medium: number; hard: number }
  focusTopics?: string[]
  candidateContext?: {
    matchingSkills?: string[]
    missingSkills?: string[]
    yearsExperience?: number
  }
  emailData: {
    to: string
    candidateName: string
    jobTitle: string
    companyName: string
    assessmentUrl: string
    duration: number
    expiresAt: string
    customMessage?: string
  }
}

export async function queueAssessmentGeneration(data: AssessmentGenerationJob) {
  if (!assessmentQueue) { warnOnce('assessment', '[Queue] Assessment queue unavailable'); return }
  await assessmentQueue.add('generate-assessment', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
  })
}
