import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const job = await prisma.job.findFirst({
      where: {
        OR: [
          { slug },
          { applicationCode: slug },
        ],
        status: 'ACTIVE',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        applicationCode: true,
        description: true,
        requirements: true,
        responsibilities: true,
        skills: true,
        department: true,
        location: true,
        locationType: true,
        employmentType: true,
        experienceLevel: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        isRemote: true,
        applicationDeadline: true,
        publishedAt: true,
        totalApplications: true,
        company: { select: { name: true, logo: true, website: true, industry: true } },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found or no longer accepting applications' }, { status: 404 })
    }

    return NextResponse.json({ data: job })
  } catch (error) {
    console.error('Public job detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
