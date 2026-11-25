import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { queueResumeProcessing } from '@/lib/queue'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const candidate = await prisma.candidate.findFirst({
      where: { id, job: { companyId: user.companyId } },
    })
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    if (!candidate.resumeUrl) {
      return NextResponse.json({ error: 'No resume uploaded yet' }, { status: 400 })
    }

    await queueResumeProcessing(id)

    return NextResponse.json({
      success: true,
      message: 'Resume processing queued. The AI will analyze the resume in the background.',
    })
  } catch (error) {
    console.error('Parse resume error:', error)
    return NextResponse.json({ error: 'Failed to queue resume processing' }, { status: 500 })
  }
}
