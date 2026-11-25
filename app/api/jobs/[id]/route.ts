import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const updateJobSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(50).optional(),
  department: z.string().optional(),
  location: z.string().optional(),
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
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED']).optional(),
  applicationDeadline: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const job = await prisma.job.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        createdBy: { select: { name: true, avatar: true } },
        _count: { select: { candidates: true, assessments: true, questions: true } },
        candidates: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, name: true, email: true, stage: true, skillMatch: true, createdAt: true },
        },
      },
    })

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    return NextResponse.json({
      data: job,
      applyLink: `${process.env.APP_URL}/apply/${job.applicationCode}`,
    })
  } catch (error) {
    console.error('Get job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const data = updateJobSchema.parse(body)

    const existing = await prisma.job.findFirst({
      where: { id, companyId: user.companyId },
    })
    if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const updateData: any = { ...data }
    if (data.applicationDeadline) {
      updateData.applicationDeadline = new Date(data.applicationDeadline)
    }

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: job })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Update job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.job.findFirst({
      where: { id, companyId: user.companyId },
    })
    if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    await prisma.job.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
