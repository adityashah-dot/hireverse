import { prisma } from '@/lib/prisma'
import { extractTextFromFile } from '@/lib/file-utils'
import { parseResume } from '@/lib/ai/parse-resume'
import { matchSkills } from '@/lib/ai/match-skills'

export async function processResume(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  })

  if (!candidate || !candidate.resumeUrl) {
    throw new Error('Candidate or resume not found')
  }

  const resumeText = await extractTextFromFile(candidate.resumeUrl)

  const parsed = await parseResume(resumeText)

  const match = await matchSkills(
    parsed.skills || [],
    candidate.job.skills || [],
    candidate.job.requirements || [],
    resumeText
  )

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      resumeText,
      resumeParsed: parsed as any,
      aiSummary: match.summary,
      skillMatch: match.score,
      matchingSkills: match.matchingSkills,
      missingSkills: match.missingSkills,
      aiReviewed: false,
    },
  })

  if (parsed.experience && parsed.experience.length > 0) {
    await prisma.workExperience.deleteMany({ where: { candidateId } })
    await prisma.workExperience.createMany({
      data: parsed.experience.map((exp) => ({
        candidateId,
        company: exp.company,
        title: exp.title,
        startDate: exp.startDate ? new Date(exp.startDate) : null,
        endDate: exp.endDate ? new Date(exp.endDate) : null,
        isCurrent: exp.isCurrent || false,
        description: exp.description || null,
      })),
    })
  }

  if (parsed.education && parsed.education.length > 0) {
    await prisma.education.deleteMany({ where: { candidateId } })
    await prisma.education.createMany({
      data: parsed.education.map((edu) => ({
        candidateId,
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field || null,
        endDate: edu.graduationYear
          ? new Date(`${edu.graduationYear}-01-01`)
          : null,
        gpa: edu.gpa || null,
      })),
    })
  }

  const recommendedStage =
    match.score >= 70
      ? 'SHORTLISTED'
      : match.score >= 40
      ? 'SCREENING'
      : candidate.stage

  await prisma.activityLog.create({
    data: {
      action: 'resume_processed',
      candidateId,
      details: {
        skillMatch: match.score,
        recommendedStage,
        skillsFound: parsed.skills?.length || 0,
        needsReview: true,
      } as any,
    },
  })

  return { parsed, match }
}
