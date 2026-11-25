import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ sessionToken: string }> }) {
  try {
    const { sessionToken } = await params
    const assessment = await prisma.assessment.findUnique({
      where: { sessionToken },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    if (assessment.status === 'COMPLETED' || assessment.status === 'EXPIRED') {
      return NextResponse.json({ error: `Assessment is ${assessment.status.toLowerCase()}` }, { status: 400 })
    }

    if (assessment.expiresAt < new Date()) {
      await prisma.assessment.update({ where: { id: assessment.id }, data: { status: 'EXPIRED' } })
      return NextResponse.json({ error: 'Assessment link has expired' }, { status: 410 })
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const makeFingerprint = (ipStr: string, ua: string) => {
      const { createHash } = require('crypto') as typeof import('crypto')
      return createHash('sha256').update(`${ipStr}:${ua}`).digest('hex').slice(0, 32)
    }

    let fingerprint = assessment.browserFingerprint
    if (!fingerprint) {
      fingerprint = makeFingerprint(ip, userAgent)
    }

    if (assessment.status === 'IN_PROGRESS' && assessment.browserFingerprint) {
      const currentFp = makeFingerprint(ip, userAgent)
      if (assessment.browserFingerprint !== currentFp) {
        await prisma.activityLog.create({
          data: {
            action: 'suspicious_access',
            candidateId: assessment.candidateId,
            details: { message: 'Different browser fingerprint detected' } as any,
          },
        })
      }
    }

    const updatedAssessment = await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: assessment.startedAt || new Date(),
        ipAddress: ip,
        userAgent,
        browserFingerprint: fingerprint,
      },
    })

    const endsAt = new Date(
      updatedAssessment.startedAt!.getTime() + updatedAssessment.duration * 60 * 1000
    )

    return NextResponse.json({
      success: true,
      startedAt: updatedAssessment.startedAt,
      endsAt,
    })
  } catch (error) {
    console.error('Start assessment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
