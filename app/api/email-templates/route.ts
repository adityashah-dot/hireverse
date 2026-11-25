import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2),
  subject: z.string().min(2),
  body: z.string().min(5),
  category: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const templates = await prisma.emailTemplate.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: templates })
  } catch (error) {
    console.error('List email templates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const data = createSchema.parse(body)

    // Extract {{variables}} from body
    const variables = [...new Set(
      [...(data.body.matchAll(/{{(\w+)}}/g))].map((m) => m[1])
    )]

    const template = await prisma.emailTemplate.create({
      data: {
        companyId: user.companyId,
        name: data.name,
        subject: data.subject,
        body: data.body,
        category: data.category || 'General',
        variables,
      },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create email template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
