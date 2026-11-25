import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const updateCandidateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedIn: z.string().optional(),
  portfolio: z.string().optional(),
  location: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  rejectionReason: z.string().optional(),
  isArchived: z.boolean().optional(),
  aiSummary: z.string().optional(),
  skillMatch: z.number().min(0).max(100).optional(),
  matchingSkills: z.array(z.string()).optional(),
  missingSkills: z.array(z.string()).optional(),
  aiReviewed: z.boolean().optional(),
  aiReviewNotes: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const getCached = unstable_cache(
      () => prisma.candidate.findFirst({
        where: { id, job: { companyId: user.companyId } },
        include: {
          job: { select: { id: true, title: true, skills: true, requirements: true, experienceLevel: true } },
          assessments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true, status: true, score: true, totalCorrect: true, questionCount: true,
              topicScores: true, completedAt: true, expiresAt: true, sentAt: true,
              sessionToken: true, tabSwitchCount: true,
            },
          },
          notes: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { author: { select: { name: true, avatar: true } } },
          },
          education: true,
          experience: { orderBy: { startDate: 'desc' } },
          interviews: {
            orderBy: { scheduledAt: 'desc' },
            take: 10,
            include: {
              aiSession: {
                select: {
                  finalScore: true, attentionScore: true, passRate: true,
                  questionsAnswered: true, questionsPassed: true, overallStatus: true, completedAt: true,
                },
              },
              feedbacks: { include: { author: { select: { name: true } } } },
            },
          },
        },
      }),
      [`candidate-${id}`],
      { revalidate: 30, tags: [`candidate-${id}`] }
    )

    const candidate = await getCached()

    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    return NextResponse.json({ data: candidate })
  } catch (error) {
    console.error('Get candidate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const data = updateCandidateSchema.parse(body)

    const existing = await prisma.candidate.findFirst({
      where: { id, job: { companyId: user.companyId } },
    })
    if (!existing) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    const candidate = await prisma.candidate.update({
      where: { id },
      data,
    })

    revalidateTag(`candidate-${id}`)
    revalidateTag(`candidates-${user.companyId}`)
    return NextResponse.json({ data: candidate })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Update candidate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.candidate.findFirst({
      where: { id, job: { companyId: user.companyId } },
    })
    if (!existing) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    await prisma.candidate.update({
      where: { id },
      data: { isArchived: true },
    })

    revalidateTag(`candidate-${id}`)
    revalidateTag(`candidates-${user.companyId}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Archive candidate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
