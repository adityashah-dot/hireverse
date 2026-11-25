import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import AssessmentsClient from './AssessmentsClient'

async function getInitialData(companyId: string) {
  return unstable_cache(
    () => Promise.all([
      prisma.candidate.findMany({
        where: { job: { companyId }, isArchived: false },
        include: {
          job: { select: { id: true, title: true, skills: true, experienceLevel: true } },
          assessments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.job.findMany({
        where: { companyId },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.assessment.findMany({
        where: { job: { companyId } },
        include: {
          candidate: { select: { id: true, name: true, email: true, job: { select: { id: true, title: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]),
    [`assessments-page-initial-${companyId}`],
    { revalidate: 30, tags: [`candidates-${companyId}`, `jobs-${companyId}`] }
  )()
}

export default async function AssessmentsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const [candidates, jobs, rawAssessments] = await getInitialData(user.companyId).catch(() => [[], [], []])

  const initialAssessments = (rawAssessments as any[]).map((a: any) => ({
    ...a,
    candidateName: a.candidate?.name || "",
    candidateId: a.candidate?.id || a.candidateId,
    jobTitle: a.candidate?.job?.title || "",
    jobId: a.candidate?.job?.id || a.jobId,
  }))

  return (
    <AssessmentsClient
      initialCandidates={candidates as any[]}
      initialJobs={jobs as any[]}
      initialAssessments={initialAssessments}
    />
  )
}
