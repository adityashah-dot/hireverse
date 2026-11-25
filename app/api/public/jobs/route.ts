import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const department = searchParams.get('department')
    const location = searchParams.get('location')
    const employmentType = searchParams.get('employmentType')
    const experienceLevel = searchParams.get('experienceLevel')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = { status: 'ACTIVE' }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (department) where.department = { contains: department, mode: 'insensitive' }
    if (location) where.location = { contains: location, mode: 'insensitive' }
    if (employmentType) where.employmentType = employmentType
    if (experienceLevel) where.experienceLevel = experienceLevel

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          applicationCode: true,
          department: true,
          location: true,
          locationType: true,
          employmentType: true,
          experienceLevel: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          skills: true,
          isRemote: true,
          applicationDeadline: true,
          publishedAt: true,
          company: { select: { name: true, logo: true, website: true } },
        },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.job.count({ where }),
    ])

    return NextResponse.json({
      data: jobs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Public jobs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
