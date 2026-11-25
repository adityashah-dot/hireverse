import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const noteSchema = z.object({
  content: z.string().min(1),
  isPrivate: z.boolean().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify candidate belongs to this user's company before returning notes
    const candidate = await prisma.candidate.findFirst({
      where: { id, job: { companyId: user.companyId } },
      select: { id: true },
    })
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    const notes = await prisma.note.findMany({
      where: { candidateId: id },
      include: { author: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: notes })
  } catch (error) {
    console.error('Get notes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const candidateForPost = await prisma.candidate.findFirst({
      where: { id, job: { companyId: user.companyId } },
      select: { id: true },
    })
    if (!candidateForPost) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    const body = await req.json()
    const { content, isPrivate } = noteSchema.parse(body)

    const note = await prisma.note.create({
      data: {
        content,
        isPrivate: isPrivate || false,
        candidateId: id,
        authorId: user.id,
      },
      include: { author: { select: { name: true, avatar: true } } },
    })

    await prisma.activityLog.create({
      data: {
        action: 'note_added',
        candidateId: id,
        userId: user.id,
        details: { noteId: note.id, isPrivate } as any,
      },
    })

    return NextResponse.json({ data: note }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create note error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
