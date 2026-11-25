import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateFileKey, getContentType } from '@/lib/file-utils'
import { withRateLimit } from '@/lib/rate-limit'
import { notifyNewApplication } from '@/lib/webhook'
import path from 'path'
import fs from 'fs/promises'

// Try to upload to S3, fall back to local storage
async function saveResume(buffer: Buffer, key: string, contentType: string): Promise<string> {
  // If S3 is configured, use it
  if (process.env.S3_ACCESS_KEY_ID && process.env.S3_BUCKET) {
    const { uploadToS3 } = await import('@/lib/storage')
    await uploadToS3(buffer, key, contentType)
    return key
  }

  // Fallback: save to local uploads directory
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'resumes')
  await fs.mkdir(uploadsDir, { recursive: true })
  const localPath = path.join(uploadsDir, path.basename(key))
  await fs.writeFile(localPath, buffer)
  return `/uploads/resumes/${path.basename(key)}`
}

// Safe queue wrappers — don't crash if Redis isn't available
async function safeQueueResume(candidateId: string) {
  try {
    const { queueResumeProcessing } = await import('@/lib/queue')
    await queueResumeProcessing(candidateId)
  } catch (err) {
    console.warn('Resume queue unavailable (Redis not configured):', (err as Error).message)
  }
}

async function safeQueueEmail(type: string, data: Record<string, any>) {
  try {
    const { queueEmail } = await import('@/lib/queue')
    await queueEmail(type, data)
  } catch (err) {
    console.warn('Email queue unavailable (Redis not configured):', (err as Error).message)
  }
}

export const POST = withRateLimit(
  { maxRequests: 20, windowMs: 60 * 1000, identifier: 'public-apply' },
  handler
)

async function handler(req: NextRequest) {
  try {
    const formData = await req.formData()

    const jobId = formData.get('jobId') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string | null
    const linkedIn = formData.get('linkedIn') as string | null
    const portfolio = formData.get('portfolio') as string | null
    const location = formData.get('location') as string | null
    const resumeFile = formData.get('resume') as File | null
    const source = (formData.get('source') as string | null) || 'website'

    if (!jobId || !name || !email) {
      return NextResponse.json({ error: 'Name, email, and jobId are required' }, { status: 400 })
    }

    const job = await prisma.job.findFirst({
      where: { id: jobId, status: 'ACTIVE' },
      include: { company: true },
    })
    if (!job) {
      return NextResponse.json(
        { error: 'This position is no longer accepting applications' },
        { status: 404 }
      )
    }

    if (job.applicationDeadline && new Date() > job.applicationDeadline) {
      return NextResponse.json({ error: 'Application deadline has passed' }, { status: 400 })
    }

    const existing = await prisma.candidate.findUnique({
      where: { email_jobId: { email, jobId } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'You have already applied for this position' },
        { status: 400 }
      )
    }

    // Check for duplicate applications across other jobs at this company
    const crossJobApplication = await prisma.candidate.findFirst({
      where: {
        email,
        job: { companyId: job.companyId },
      },
      select: { id: true, job: { select: { title: true } } },
    })
    const isDuplicateApplicant = !!crossJobApplication

    let resumeUrl: string | null = null
    if (resumeFile && resumeFile.size > 0) {
      const allowedTypes = ['.pdf', '.doc', '.docx']
      const ext = resumeFile.name.split('.').pop()?.toLowerCase() || ''
      if (!allowedTypes.includes(`.${ext}`)) {
        return NextResponse.json(
          { error: 'Only PDF, DOC, and DOCX files are allowed' },
          { status: 400 }
        )
      }
      if (resumeFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 })
      }

      const buffer = Buffer.from(await resumeFile.arrayBuffer())
      const key = generateFileKey(`resumes/${jobId}`, resumeFile.name)
      resumeUrl = await saveResume(buffer, key, getContentType(resumeFile.name))
    }

    const candidate = await prisma.candidate.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone || null,
        linkedIn: linkedIn || null,
        portfolio: portfolio || null,
        location: location || null,
        resumeUrl,
        jobId,
        source,
        stage: 'APPLIED',
      },
    })

    await prisma.job.update({
      where: { id: jobId },
      data: { totalApplications: { increment: 1 } },
    })

    await prisma.activityLog.create({
      data: {
        action: 'application_received',
        candidateId: candidate.id,
        details: { source, hasResume: !!resumeUrl, jobTitle: job.title, isDuplicateApplicant } as any,
      },
    })

    if (resumeUrl) {
      await safeQueueResume(candidate.id)
    }

    await safeQueueEmail('application-received', {
      to: email,
      candidateName: name,
      jobTitle: job.title,
      companyName: job.company.name,
    })

    notifyNewApplication({
      candidateName: name,
      jobTitle: job.title,
      companyName: job.company.name,
      candidateId: candidate.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully! We will be in touch soon.',
      candidateId: candidate.id,
    })
  } catch (error) {
    console.error('Public apply error:', error)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
