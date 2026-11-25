import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateQuestions } from '@/lib/ai/generate-questions'
import { z } from 'zod'

const generateSchema = z.object({
  jobId: z.string(),
  count: z.number().min(5).max(50).optional(),
  saveToBank: z.boolean().optional(),
  difficultyMix: z.object({
    easy: z.number(),
    medium: z.number(),
    hard: z.number(),
  }).optional(),
  focusTopics: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { jobId, count = 20, saveToBank = true, difficultyMix, focusTopics } = generateSchema.parse(body)

    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId: user.companyId },
    })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const questions = await generateQuestions({
      jobTitle: job.title,
      skills: job.skills,
      experienceLevel: job.experienceLevel,
      count,
      difficultyMix,
      focusTopics,
    })

    if (saveToBank) {
      await prisma.question.createMany({
        data: questions.map((q) => ({
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          category: q.category,
          difficulty: q.difficulty,
          jobId,
          isAiGenerated: true,
        })),
      })
    }

    return NextResponse.json({ data: questions, count: questions.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Generate questions error:', error)
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
  }
}
