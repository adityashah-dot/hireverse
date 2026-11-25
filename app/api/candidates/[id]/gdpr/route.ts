import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id: candidateId } = await params

    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, job: { companyId: user.companyId } },
      include: {
        job: { select: { title: true, department: true } },
        education: true,
        experience: true,
        assessments: {
          include: { responses: true },
        },
        notes: true,
      },
    })

    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    const payload = {
      personalData: {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        linkedIn: candidate.linkedIn,
        portfolio: candidate.portfolio,
        location: candidate.location,
      },
      application: {
        jobTitle: candidate.job.title,
        department: candidate.job.department,
        stage: candidate.stage,
        appliedAt: candidate.createdAt,
        source: (candidate as any).source || 'unknown',
      },
      resumeText: candidate.resumeText,
      resumeParsed: candidate.resumeParsed,
      education: candidate.education,
      workExperience: candidate.experience,
      aiSummary: candidate.aiSummary,
      skillMatch: candidate.skillMatch,
      matchingSkills: candidate.matchingSkills,
      missingSkills: candidate.missingSkills,
      assessments: candidate.assessments.map((a: any) => ({
        status: a.status,
        score: a.score,
        topicScores: a.topicScores,
        completedAt: a.completedAt,
        responses: a.responses.map((r: any) => ({
          selectedAnswer: r.selectedAnswer,
          isCorrect: r.isCorrect,
          timeTaken: r.timeTaken,
        })),
      })),
      recruiterNotes: candidate.notes.map((n: any) => ({
        content: n.content,
        createdAt: n.createdAt,
      })),
      exportedAt: new Date().toISOString(),
      exportedBy: user.id,
    }

    await prisma.activityLog.create({
      data: {
        action: 'gdpr_export',
        candidateId,
        userId: user.id,
        details: { exportedAt: new Date().toISOString() } as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: payload,
      message: `Data export for ${candidate.name} generated`,
    })
  } catch (error) {
    console.error('GDPR export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id: candidateId } = await params

    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, job: { companyId: user.companyId } },
    })

    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    await prisma.$transaction([
      prisma.response.deleteMany({ where: { assessment: { candidateId } } }),
      prisma.assessment.deleteMany({ where: { candidateId } }),
      prisma.education.deleteMany({ where: { candidateId } }),
      prisma.workExperience.deleteMany({ where: { candidateId } }),
      prisma.note.deleteMany({ where: { candidateId } }),
      prisma.activityLog.deleteMany({ where: { candidateId } }),
      prisma.interviewFeedback.deleteMany({ where: { interview: { candidateId } } }),
      prisma.interview.deleteMany({ where: { candidateId } }),
      prisma.candidate.update({
        where: { id: candidateId },
        data: {
          name: '[REDACTED]',
          email: `redacted-${candidateId}@deleted.local`,
          phone: null,
          linkedIn: null,
          portfolio: null,
          location: null,
          resumeUrl: null,
          resumeText: null,
          resumeParsed: null as any,
          aiSummary: null,
          skillMatch: null,
          matchingSkills: [],
          missingSkills: [],
          isArchived: true,
          stage: 'REJECTED',
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'All data for candidate has been permanently deleted',
    })
  } catch (error) {
    console.error('GDPR deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
