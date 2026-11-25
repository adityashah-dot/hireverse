import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'
import { sendEmail, aiInterviewInviteHtml } from '@/lib/email'

const AI_SERVICE_URL = process.env.AI_INTERVIEW_SERVICE_URL || 'http://localhost:8000'

function getQuestionCountForDuration(durationMinutes: number): number {
  if (durationMinutes <= 20) return 5
  if (durationMinutes <= 30) return 6
  if (durationMinutes <= 45) return 8
  if (durationMinutes <= 60) return 10
  return 12
}

function mapInterviewTypeToPrompt(type: 'PHONE_SCREEN' | 'VIDEO' | 'ONSITE' | 'TECHNICAL' | 'BEHAVIORAL' | 'FINAL'): string {
  switch (type) {
    case 'TECHNICAL':
      return 'Technical Interview'
    case 'BEHAVIORAL':
      return 'Behavioral Interview'
    case 'VIDEO':
      // In UI, VIDEO type is currently used for System Design rounds.
      return 'System Design Interview'
    case 'PHONE_SCREEN':
      return 'Phone Screen Interview'
    case 'ONSITE':
      return 'Onsite Interview'
    case 'FINAL':
      return 'Culture Fit Interview'
    default:
      return 'Technical Interview'
  }
}

function generateIcsEvent(title: string, description: string, url: string, startDate: Date, durationMinutes: number): string {
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HireVerse//AI Interview//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `URL:${url}`,
    `LOCATION:${url}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')
}

const createInterviewSchema = z.object({
  candidateId: z.string(),
  jobId: z.string(),
  title: z.string().min(3),
  type: z.enum(['PHONE_SCREEN', 'VIDEO', 'ONSITE', 'TECHNICAL', 'BEHAVIORAL', 'FINAL']),
  scheduledAt: z.string(),
  duration: z.number().min(15).max(480).optional(),
  timezone: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
  location: z.string().optional(),
  interviewerIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const candidateId = searchParams.get('candidateId')
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: any = {
      candidate: { job: { companyId: user.companyId } },
    }
    if (candidateId) where.candidateId = candidateId
    if (status) where.status = status
    if (from || to) {
      where.scheduledAt = {}
      if (from) where.scheduledAt.gte = new Date(from)
      if (to) where.scheduledAt.lte = new Date(to)
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where,
        include: {
          candidate: { select: { id: true, name: true, email: true, job: { select: { title: true } } } },
          aiSession: {
            select: {
              finalScore: true,
              attentionScore: true,
              passRate: true,
              questionsAnswered: true,
              questionsPassed: true,
              overallStatus: true,
              completedAt: true,
            },
          },
          feedbacks: { include: { author: { select: { name: true, avatar: true } } } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.interview.count({ where }),
    ])

    return NextResponse.json({ data: interviews, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('List interviews error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const data = createInterviewSchema.parse(body)

    const candidate = await prisma.candidate.findFirst({
      where: { id: data.candidateId, job: { companyId: user.companyId } },
      include: { job: { include: { company: true } } }
    })
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    // Extract candidate skills and job context for AI question generation
    const parsedResume = candidate.resumeParsed as any
    const candidateSkills: string[] = parsedResume?.skills ?? candidate.skills ?? []
    const requiredSkills: string[] = (candidate.job as any).skills ?? []
    const experienceLevel: string = (candidate.job as any).experienceLevel ?? 'MID'
    const candidateYears: number | undefined = parsedResume?.totalYearsExperience ?? undefined

    const interview = await prisma.interview.create({
      data: {
        candidateId: data.candidateId,
        jobId: data.jobId,
        title: data.title,
        type: data.type,
        scheduledAt: new Date(data.scheduledAt),
        duration: data.duration || 60,
        timezone: data.timezone || 'UTC',
        meetingLink: data.meetingLink || null,
        location: data.location,
        interviewerIds: data.interviewerIds || [],
        notes: data.notes,
        status: 'SCHEDULED',
      },
      include: {
        candidate: { select: { name: true, email: true } },
      },
    })

    // Pre-generate AI interview questions when the link is created.
    // If this fails, we abort invitation flow so candidates never receive a broken link.
    try {
      const durationMinutes = data.duration || 60
      const questionCount = getQuestionCountForDuration(durationMinutes)
      const interviewTypePrompt = mapInterviewTypeToPrompt(data.type)

      const preGenRes = await fetch(`${AI_SERVICE_URL}/api/interview/pregenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview_id: interview.id,
          position: candidate.job.title,
          interview_type: interviewTypePrompt,
          question_count: questionCount,
          experience_level: experienceLevel,
          candidate_skills: candidateSkills,
          required_skills: requiredSkills,
          candidate_experience_years: candidateYears ?? null,
        }),
      })

      if (!preGenRes.ok) {
        const errText = await preGenRes.text()
        throw new Error(errText || `HTTP ${preGenRes.status}`)
      }
    } catch (preGenError: any) {
      console.error('AI pre-generation failed — interview created with fallback questions:', preGenError.message)
      await prisma.interview.update({
        where: { id: interview.id },
        data: { notes: (interview.notes || '') + '\n[AI question pre-generation failed. Using fallback question pool.]' },
      })
    }

    await prisma.activityLog.create({
      data: {
        action: 'interview_scheduled',
        candidateId: data.candidateId,
        userId: user.id,
        details: { interviewId: interview.id, type: data.type, scheduledAt: data.scheduledAt } as any,
      },
    })

    // All interviews are now AI interviews
    const interviewUrl = `${process.env.APP_URL || 'http://localhost:3000'}/ai-interview/${interview.id}`
    const scheduledAtDate = new Date(data.scheduledAt)
    const duration = data.duration || 60
    const companyName = candidate.job.company.name

    const friendlyType = data.type.toLowerCase().replace('_', ' ')
    const html = aiInterviewInviteHtml({
      candidateName: candidate.name,
      jobTitle: candidate.job.title,
      companyName,
      interviewUrl,
      scheduledAt: scheduledAtDate,
      duration,
      customMessage: data.notes || `We are excited to have you take this AI-driven ${friendlyType} interview! Please find a quiet place and ensure your microphone and camera are working properly.`
    })

    const icsString = generateIcsEvent(
      `AI ${data.type} Interview: ${candidate.job.title} at ${companyName}`,
      `Your AI voice interview is scheduled. Please join using this link at the scheduled time: ${interviewUrl}\n\nNotes from Recruiter: ${data.notes || ''}`,
      interviewUrl,
      scheduledAtDate,
      duration
    )

    await sendEmail({
      to: candidate.email,
      subject: `Interview Scheduled: ${candidate.job.title} at ${companyName}`,
      html,
      icalEvent: {
        method: 'REQUEST',
        content: icsString
      }
    })

    return NextResponse.json({ data: interview }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create interview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
