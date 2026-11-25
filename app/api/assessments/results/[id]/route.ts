import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const assessment = await prisma.assessment.findFirst({
      where: {
        id,
        job: { companyId: user.companyId },
      },
      include: {
        candidate: {
          select: { id: true, name: true, email: true, skillMatch: true, aiSummary: true },
        },
        job: { select: { id: true, title: true } },
        responses: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                options: true,
                correctAnswer: true,
                explanation: true,
                category: true,
                difficulty: true,
              },
            },
          },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    return NextResponse.json({ data: assessment })
  } catch (error) {
    console.error('Get assessment results error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
