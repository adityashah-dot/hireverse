import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { uploadToS3 } from '@/lib/storage'
import { queueResumeProcessing } from '@/lib/queue'
import { generateFileKey, getContentType } from '@/lib/file-utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.candidate.findFirst({
      where: { id, job: { companyId: user.companyId } },
    })
    if (!existing) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get('resume') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
      return NextResponse.json({ error: 'Only PDF, DOC, and DOCX files are allowed' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB allowed.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = generateFileKey(`resumes/${existing.jobId}`, file.name)
    const contentType = getContentType(file.name) || file.type

    try {
      await uploadToS3(buffer, key, contentType)
    } catch (uploadErr) {
      console.error('S3 upload failed:', uploadErr)
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 502 })
    }

    await prisma.candidate.update({
      where: { id },
      data: { resumeUrl: key },
    })

    try {
      await queueResumeProcessing(id)
    } catch (queueErr) {
      console.error('Failed to queue resume processing — marking for retry:', queueErr)
      await prisma.candidate.update({
        where: { id },
        data: { resumeParsed: { processingStatus: 'QUEUE_FAILED' } as any },
      }).catch(() => {})
    }

    await prisma.activityLog.create({
      data: {
        action: 'resume_uploaded',
        candidateId: id,
        userId: user.id,
        details: { filename: file.name, key } as any,
      },
    })

    return NextResponse.json({ success: true, resumeKey: key })
  } catch (error) {
    console.error('Resume upload error:', error)
    return NextResponse.json({ error: 'Failed to upload resume' }, { status: 500 })
  }
}
