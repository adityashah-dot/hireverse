import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const createCandidateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  linkedIn: z.string().url().optional().or(z.literal('')),
  portfolio: z.string().url().optional().or(z.literal('')),
  location: z.string().optional(),
  jobId: z.string(),
  source: z.string().optional(),
  referredBy: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')
    const stage = searchParams.get('stage')
    const search = searchParams.get('search')
    const department = searchParams.get('department')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    const where: any = {
      job: { companyId: user.companyId },
      isArchived: false,
    }

    if (jobId) where.jobId = jobId
    if (stage) where.stage = stage
    if (department) where.job.department = department
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orderBy: any = { [sortBy]: sortOrder }

    const cacheKey = `candidates-${user.companyId}-${jobId || ''}-${stage || ''}-${search || ''}-${page}-${limit}-${sortBy}-${sortOrder}`
    const getCached = unstable_cache(
      () => Promise.all([
        prisma.candidate.findMany({
          where,
          include: {
            job: { select: { id: true, title: true } },
            _count: { select: { assessments: true, notes: true } },
            assessments: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, status: true, score: true, completedAt: true },
            },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.candidate.count({ where }),
      ]),
      [cacheKey],
      { revalidate: 30, tags: [`candidates-${user.companyId}`] }
    )

    const [candidates, total] = await getCached()

    return NextResponse.json({
      data: candidates,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('List candidates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const data = createCandidateSchema.parse(body)

    const job = await prisma.job.findFirst({
      where: { id: data.jobId, companyId: user.companyId },
    })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const existing = await prisma.candidate.findUnique({
      where: { email_jobId: { email: data.email, jobId: data.jobId } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Candidate already applied for this job' }, { status: 400 })
    }

    // Check for duplicate applications across other jobs at this company
    const crossJobApplication = await prisma.candidate.findFirst({
      where: {
        email: data.email,
        job: { companyId: user.companyId },
      },
      select: { id: true, job: { select: { title: true } } },
    })
    const isDuplicateApplicant = !!crossJobApplication

    const candidate = await prisma.candidate.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        linkedIn: data.linkedIn || null,
        portfolio: data.portfolio || null,
        location: data.location,
        jobId: data.jobId,
        source: data.source || 'manual',
        referredBy: data.referredBy,
      },
    })

    await prisma.activityLog.create({
      data: {
        action: 'candidate_created',
        candidateId: candidate.id,
        userId: user.id,
        details: { source: 'manual', jobTitle: job.title } as any,
      },
    })

    (revalidateTag as any)(`candidates-${user.companyId}`)
    (revalidateTag as any)(`dashboard-analytics-${user.companyId}`)
    return NextResponse.json({ data: candidate }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create candidate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
