import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

async function _fetchDashboardAnalytics(companyId: string, rangeDays: number) {
  const now = new Date()
  const rangeStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalJobs,
    jobsInRange,
    activeJobs,
    totalCandidates,
    candidatesInRange,
    newCandidatesThisWeek,
    assessmentsSent,
    assessmentsInRange,
    assessmentsCompleted,
    hiredCount,
    offersInRange,
    avgScore,
    stageBreakdown,
    topJobs,
    recentActivities,
  ] = await Promise.all([
    prisma.job.count({ where: { companyId } }),
    prisma.job.count({ where: { companyId, createdAt: { gte: rangeStart } } }),
    prisma.job.count({ where: { companyId, status: 'ACTIVE' } }),
    prisma.candidate.count({ where: { job: { companyId }, isArchived: false } }),
    prisma.candidate.count({ where: { job: { companyId }, isArchived: false, createdAt: { gte: rangeStart } } }),
    prisma.candidate.count({ where: { job: { companyId }, isArchived: false, createdAt: { gte: sevenDaysAgo } } }),
    prisma.assessment.count({ where: { job: { companyId } } }),
    prisma.assessment.count({ where: { job: { companyId }, createdAt: { gte: rangeStart } } }),
    prisma.assessment.count({ where: { job: { companyId }, status: 'COMPLETED' } }),
    prisma.candidate.count({ where: { job: { companyId }, stage: 'HIRED' } }),
    prisma.candidate.count({ where: { job: { companyId }, stage: 'HIRED', updatedAt: { gte: rangeStart } } }),
    prisma.assessment.aggregate({
      where: { job: { companyId }, status: 'COMPLETED', score: { not: null } },
      _avg: { score: true },
    }),
    prisma.candidate.groupBy({
      by: ['stage'],
      where: { job: { companyId }, isArchived: false },
      _count: true,
    }),
    prisma.job.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        department: true,
        totalApplications: true,
        _count: { select: { candidates: true } },
      },
      orderBy: { totalApplications: 'desc' },
      take: 5,
    }),
    prisma.activityLog.findMany({
      where: { candidate: { job: { companyId } }, createdAt: { gte: rangeStart } },
      include: {
        candidate: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  const pipelineMap: Record<string, number> = {}
  for (const item of stageBreakdown) {
    pipelineMap[item.stage] = item._count
  }

  return {
    overview: {
      rangeDays,
      totalJobs,
      jobsInRange,
      activeJobs,
      totalCandidates,
      candidatesInRange,
      newCandidatesThisWeek,
      assessmentsSent,
      assessmentsInRange,
      assessmentsCompleted,
      assessmentCompletionRate:
        assessmentsSent > 0 ? Math.round((assessmentsCompleted / assessmentsSent) * 100) : 0,
      hiredCount,
      offersInRange,
      avgAssessmentScore: Math.round(avgScore._avg.score || 0),
    },
    pipeline: {
      APPLIED: pipelineMap['APPLIED'] || 0,
      SCREENING: pipelineMap['SCREENING'] || 0,
      SHORTLISTED: pipelineMap['SHORTLISTED'] || 0,
      ASSESSMENT_SENT: pipelineMap['ASSESSMENT_SENT'] || 0,
      ASSESSMENT_DONE: pipelineMap['ASSESSMENT_DONE'] || 0,
      INTERVIEW: pipelineMap['INTERVIEW'] || 0,
      OFFER: pipelineMap['OFFER'] || 0,
      HIRED: pipelineMap['HIRED'] || 0,
      REJECTED: pipelineMap['REJECTED'] || 0,
    },
    topJobs,
    recentActivities,
  }
}

export function fetchDashboardAnalytics(companyId: string, rangeDays: number) {
  return unstable_cache(
    () => _fetchDashboardAnalytics(companyId, rangeDays),
    [`dashboard-analytics-${companyId}-${rangeDays}`],
    { revalidate: 60, tags: [`dashboard-analytics-${companyId}`] }
  )()
}
