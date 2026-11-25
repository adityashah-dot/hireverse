import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionToken: string }> }) {
  try {
    const { sessionToken } = await params
    const assessment = await prisma.assessment.findUnique({
      where: { sessionToken },
      include: {
        job: {
          select: {
            title: true,
            experienceLevel: true,
            company: { select: { name: true, logo: true } },
          },
        },
        candidate: { select: { name: true } },
      },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    if (assessment.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Assessment already completed' }, { status: 400 })
    }

    if (assessment.status === 'PREPARING') {
      return NextResponse.json({
        status: 'preparing',
        message: 'Your assessment is still being prepared. Please check back in a few minutes.',
        data: {
          id: assessment.id,
          sessionToken: assessment.sessionToken,
          jobTitle: assessment.job.title,
          companyName: assessment.job.company.name,
          candidateName: assessment.candidate.name,
          duration: assessment.duration,
          questionCount: assessment.questionCount,
          status: 'PREPARING',
        },
      })
    }

    if (assessment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Assessment has been cancelled' }, { status: 400 })
    }

    if (assessment.status === 'EXPIRED' || assessment.expiresAt < new Date()) {
      if (assessment.status !== 'EXPIRED') {
        await prisma.assessment.update({
          where: { id: assessment.id },
          data: { status: 'EXPIRED' },
        })
      }
      return NextResponse.json({ error: 'Assessment link has expired' }, { status: 410 })
    }

    const questions = await prisma.question.findMany({
      where: { id: { in: assessment.questionIds } },
      select: {
        id: true,
        text: true,
        options: true,
        category: true,
        difficulty: true,
      },
    })

    const shuffled = shuffleArray(questions)

    return NextResponse.json({
      data: {
        id: assessment.id,
        sessionToken: assessment.sessionToken,
        jobTitle: assessment.job.title,
        experienceLevel: assessment.job.experienceLevel,
        companyName: assessment.job.company.name,
        companyLogo: assessment.job.company.logo,
        candidateName: assessment.candidate.name,
        duration: assessment.duration,
        questionCount: assessment.questionCount,
        status: assessment.status,
        startedAt: assessment.startedAt,
        expiresAt: assessment.expiresAt,
        questions: shuffled,
      },
    })
  } catch (error) {
    console.error('Get assessment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
