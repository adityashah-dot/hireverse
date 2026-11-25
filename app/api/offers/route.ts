import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendEmail, offerLetterHtml } from '@/lib/email'
import { z } from 'zod'

const offerSchema = z.object({
  candidateId: z.string(),
  salary: z.string().optional(),
  startDate: z.string().optional(),
  employmentType: z.string().optional(),
  customMessage: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const data = offerSchema.parse(body)

    const candidate = await prisma.candidate.findFirst({
      where: { id: data.candidateId, job: { companyId: user.companyId } },
      include: {
        job: { include: { company: true } },
      },
    })

    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    if (candidate.stage !== 'OFFER') {
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { stage: 'OFFER' },
      })
    }

    const offerUrl = `${process.env.APP_URL || 'http://localhost:3000'}/application-status`
    const html = offerLetterHtml({
      candidateName: candidate.name,
      jobTitle: candidate.job.title,
      companyName: candidate.job.company.name,
      salary: data.salary,
      startDate: data.startDate,
      location: candidate.job.location || undefined,
      employmentType: data.employmentType,
      customMessage: data.customMessage,
      offerUrl,
    })

    await sendEmail({
      to: candidate.email,
      subject: `Job Offer: ${candidate.job.title} at ${candidate.job.company.name}`,
      html,
    })

    await prisma.activityLog.create({
      data: {
        action: 'offer_sent',
        candidateId: candidate.id,
        userId: user.id,
        details: {
          jobTitle: candidate.job.title,
          companyName: candidate.job.company.name,
          salary: data.salary,
          startDate: data.startDate,
        } as any,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Offer letter sent to ${candidate.name}`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Send offer error:', error)
    return NextResponse.json({ error: 'Failed to send offer' }, { status: 500 })
  }
}
