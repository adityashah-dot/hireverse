import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const createQuestionSchema = z.object({
  text: z.string().min(10),
  options: z.array(z.string()).length(4),
  correctAnswer: z.number().min(0).max(3),
  explanation: z.string().optional(),
  category: z.string().min(1),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  jobId: z.string().optional(),
  isGlobal: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {
      OR: [
        { isGlobal: true },
        { job: { companyId: user.companyId } },
      ],
    }
    if (jobId) where.jobId = jobId
    if (category) where.category = { contains: category, mode: 'insensitive' }
    if (difficulty) where.difficulty = difficulty

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.question.count({ where }),
    ])

    return NextResponse.json({
      data: questions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('List questions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const data = createQuestionSchema.parse(body)

    if (data.jobId) {
      const job = await prisma.job.findFirst({
        where: { id: data.jobId, companyId: user.companyId },
      })
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const question = await prisma.question.create({
      data: {
        text: data.text,
        options: data.options,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        category: data.category,
        difficulty: data.difficulty,
        jobId: data.jobId,
        isGlobal: data.isGlobal || false,
        isAiGenerated: false,
      },
    })

    return NextResponse.json({ data: question }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create question error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
