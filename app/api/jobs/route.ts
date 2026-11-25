import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const createJobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(50),
  department: z.string().min(1),
  location: z.string().min(1),
  locationType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).optional(),
  experienceLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE']).optional(),
  requirements: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryCurrency: z.string().optional(),
  isRemote: z.boolean().optional(),
  applicationDeadline: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = { companyId: user.companyId }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ]
    }

    const cacheKey = `jobs-${user.companyId}-${status || ''}-${search || ''}-${page}-${limit}`
    const getCached = unstable_cache(
      () => Promise.all([
        prisma.job.findMany({
          where,
          include: {
            createdBy: { select: { name: true, avatar: true } },
            _count: { select: { candidates: true, assessments: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.job.count({ where }),
      ]),
      [cacheKey],
      { revalidate: 60, tags: [`jobs-${user.companyId}`] }
    )

    const [jobs, total] = await getCached()

    return NextResponse.json({
      data: jobs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('List jobs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const data = createJobSchema.parse(body)

    const slug =
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString(36)

    const job = await prisma.job.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        department: data.department,
        location: data.location,
        locationType: data.locationType || 'HYBRID',
        employmentType: data.employmentType || 'FULL_TIME',
        experienceLevel: data.experienceLevel || 'MID',
        requirements: data.requirements || [],
        responsibilities: data.responsibilities || [],
        skills: data.skills || [],
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        salaryCurrency: data.salaryCurrency || 'USD',
        isRemote: data.isRemote || false,
        applicationDeadline: data.applicationDeadline ? new Date(data.applicationDeadline) : null,
        companyId: user.companyId,
        createdById: user.id,
      },
    })

    revalidateTag(`jobs-${user.companyId}`)
    revalidateTag(`dashboard-analytics-${user.companyId}`)
    return NextResponse.json(
      {
        data: job,
        applyLink: `${process.env.APP_URL}/apply/${job.applicationCode}`,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
