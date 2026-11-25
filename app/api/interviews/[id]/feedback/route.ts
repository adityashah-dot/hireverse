import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  recommendation: z.enum(['STRONG_YES', 'YES', 'NEUTRAL', 'NO', 'STRONG_NO']).optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const interview = await prisma.interview.findFirst({
      where: { id, candidate: { job: { companyId: user.companyId } } },
    })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })

    const body = await req.json()
    const data = feedbackSchema.parse(body)

    const feedback = await prisma.interviewFeedback.upsert({
      where: { interviewId_authorId: { interviewId: id, authorId: user.id } },
      update: data,
      create: {
        interviewId: id,
        authorId: user.id,
        ...data,
      },
      include: { author: { select: { name: true, avatar: true } } },
    })

    return NextResponse.json({ data: feedback })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Interview feedback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
