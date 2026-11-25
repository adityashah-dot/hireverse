import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  companyName: z.string().min(2).optional(),
  companyLogo: z.string().optional(),
  companyWebsite: z.string().optional(),
  companyIndustry: z.string().optional(),
  companySize: z.string().optional(),
  defaultAssessmentDuration: z.number().min(10).max(180).optional(),
  assessmentLinkExpiryDays: z.number().min(1).max(7).optional(),
  passingScore: z.number().min(1).max(100).optional(),
  senderName: z.string().optional(),
  replyToEmail: z.string().email().optional(),
  notifyOnNewApplication: z.boolean().optional(),
  notifyOnAssessmentComplete: z.boolean().optional(),
  weeklyReportEnabled: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      include: { settings: true },
    })

    return NextResponse.json({ data: company })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['ADMIN', 'HIRING_MANAGER'].includes(user.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const data = updateSettingsSchema.parse(body)

    const { companyName, companyLogo, companyWebsite, companyIndustry, companySize, ...settingsData } = data

    if (companyName || companyLogo || companyWebsite || companyIndustry || companySize) {
      await prisma.company.update({
        where: { id: user.companyId },
        data: {
          ...(companyName && { name: companyName }),
          ...(companyLogo !== undefined && { logo: companyLogo }),
          ...(companyWebsite !== undefined && { website: companyWebsite }),
          ...(companyIndustry !== undefined && { industry: companyIndustry }),
          ...(companySize !== undefined && { size: companySize }),
        },
      })
    }

    if (Object.keys(settingsData).length > 0) {
      await prisma.companySettings.upsert({
        where: { companyId: user.companyId },
        update: settingsData,
        create: { companyId: user.companyId, ...settingsData },
      })
    }

    const updated = await prisma.company.findUnique({
      where: { id: user.companyId },
      include: { settings: true },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
