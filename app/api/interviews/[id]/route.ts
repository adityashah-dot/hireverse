import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const updateInterviewSchema = z.object({
  title: z.string().optional(),
  type: z.enum(['PHONE_SCREEN', 'VIDEO', 'ONSITE', 'TECHNICAL', 'BEHAVIORAL', 'FINAL']).optional(),
  scheduledAt: z.string().optional(),
  duration: z.number().optional(),
  meetingLink: z.string().optional(),
  location: z.string().optional(),
  interviewerIds: z.array(z.string()).optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.interview.findFirst({
      where: { id, candidate: { job: { companyId: user.companyId } } },
    })
    if (!existing) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })

    const body = await req.json()
    const data = updateInterviewSchema.parse(body)

    const updateData: any = { ...data }
    if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt)

    const interview = await prisma.interview.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: interview })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Update interview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.interview.findFirst({
      where: { id, candidate: { job: { companyId: user.companyId } } },
    })
    if (!existing) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })

    await prisma.interview.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel interview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
