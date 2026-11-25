import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const eventSchema = z.object({
  type: z.enum(['tab_switch', 'window_blur', 'copy_attempt', 'right_click']),
  count: z.number().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ sessionToken: string }> }) {
  try {
    const { sessionToken } = await params
    const assessment = await prisma.assessment.findUnique({
      where: { sessionToken },
    })

    if (!assessment || assessment.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Invalid assessment' }, { status: 400 })
    }

    const body = await req.json()
    const { type, count } = eventSchema.parse(body)

    if (type === 'tab_switch') {
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { tabSwitchCount: { increment: 1 } },
      })
    }

    await prisma.activityLog.create({
      data: {
        action: `assessment_event_${type}`,
        candidateId: assessment.candidateId,
        details: { assessmentId: assessment.id, type, count } as any,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Assessment event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
