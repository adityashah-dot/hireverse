import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch company logo (not in JWT) — this route is only called for the profile page
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { logo: true },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        companyId: user.companyId,
        companyName: user.companyName,
        companyLogo: company?.logo ?? null,
      },
    })
  } catch (error) {
    console.error('Get me error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
