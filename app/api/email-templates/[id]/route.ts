import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  subject: z.string().min(2).optional(),
  body: z.string().min(5).optional(),
  category: z.string().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.emailTemplate.findFirst({
      where: { id, companyId: user.companyId },
    })
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const body = await req.json()
    const data = updateSchema.parse(body)

    const updateData: any = { ...data }
    if (data.body) {
      updateData.variables = [...new Set(
        [...(data.body.matchAll(/{{(\w+)}}/g))].map((m: any) => m[1])
      )]
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: template })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Update email template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.emailTemplate.findFirst({
      where: { id, companyId: user.companyId },
    })
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    await prisma.emailTemplate.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete email template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
