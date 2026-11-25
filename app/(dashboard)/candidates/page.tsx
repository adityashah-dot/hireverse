import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import CandidatesClient from './CandidatesClient'

async function getInitialData(companyId: string) {
  return unstable_cache(
    () => Promise.all([
      prisma.candidate.findMany({
        where: { job: { companyId }, isArchived: false },
        include: {
          job: { select: { id: true, title: true } },
          _count: { select: { assessments: true, notes: true } },
          assessments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true, score: true, completedAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.job.findMany({
        where: { companyId },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]),
    [`candidates-page-initial-${companyId}`],
    { revalidate: 30, tags: [`candidates-${companyId}`] }
  )()
}

export default async function CandidatesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const [candidates, jobs] = await getInitialData(user.companyId).catch(() => [[], []])

  return <CandidatesClient initialCandidates={candidates} initialJobs={jobs} />
}
