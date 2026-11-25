import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = schema.parse(body)

    const user = await prisma.user.findUnique({ where: { email } })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: { token, expiresAt },
      create: { userId: user.id, token, expiresAt },
    })

    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`

    // Send email if resend is configured
    if (process.env.RESEND_API_KEY) {
      const { sendEmail } = await import('@/lib/email')
      await sendEmail({
        to: email,
        subject: 'Reset your HireVerse password',
        html: `
          <p>Hi ${user.name},</p>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you didn't request this, ignore this email.</p>
        `,
      })
    }

    return NextResponse.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
