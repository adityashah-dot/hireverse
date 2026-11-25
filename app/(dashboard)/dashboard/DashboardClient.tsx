"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Briefcase, Users, ClipboardCheck, Gift, ArrowUpRight, Clock, User, FileCheck, Plus, TrendingUp, TrendingDown, Sparkles, Zap, Target, Award, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area } from "recharts"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  candidate_created: User,
  candidate_applied: User,
  candidate_stage_changed: ArrowUpRight,
  assessment_sent: FileCheck,
  assessment_completed: FileCheck,
  resume_processed: FileCheck,
  job_created: Plus,
  interview_scheduled: Clock,
}

const funnelColors = [
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#f97316",
  "#22c55e",
]

interface Props {
  initialData?: any
}

export default function DashboardClient({ initialData }: Props) {
  const [analytics, setAnalytics] = useState<any>(initialData ?? null)
  const [selectedRange, setSelectedRange] = useState<7 | 30 | 90>(30)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(!initialData)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadAnalytics = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    else if (!analytics) setIsLoadingData(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/analytics/dashboard?rangeDays=${selectedRange}`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const payload = await res.json()
      setAnalytics(payload.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics'
      setLoadError(message)
      console.error('Dashboard load error:', err)
    } finally {
      setIsLoadingData(false)
      if (showRefreshing) setIsRefreshing(false)
    }
  }

  useEffect(() => {
    // Skip initial fetch when server already provided data for the default range
    if (analytics && selectedRange === 30) return
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange])

  useEffect(() => {
    const onFocus = () => loadAnalytics()
    const onVisible = () => { if (!document.hidden) loadAnalytics() }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange])

  const overview = analytics?.overview || {}
  const pipelineObj = analytics?.pipeline || {}
  const livePipeline = Object.entries(pipelineObj).map(([stage, count]) => ({ stage, count: count as number }))
  const liveActivities = analytics?.recentActivities || []
  const liveTopJobs = analytics?.topJobs || []

  const liveKpi = {
    totalJobs: overview.totalJobs ?? 0,
    activeJobs: overview.activeJobs ?? 0,
    jobsInRange: overview.jobsInRange ?? 0,
    newCandidates: overview.candidatesInRange ?? 0,
    assessmentsScheduled: overview.assessmentsInRange ?? 0,
    offersExtended: overview.offersInRange ?? 0,
    totalJobsTrend: 0,
    newCandidatesTrend: 0,
    assessmentsTrend: overview.assessmentCompletionRate ?? 0,
    offersTrend: 0,
  }

  const topJobs = liveTopJobs

  const maxCount = Math.max(...livePipeline.map((d: any) => d.count || d._count || 0), 1)
  const funnelDataWithPercentage = livePipeline.map((item: any, index: number) => ({
    stage: item.stage || item._id,
    count: item.count || item._count || 0,
    percentage: ((item.count || item._count || 0) / maxCount) * 100,
    color: funnelColors[index % funnelColors.length],
  }))

  const avgTimeToHire = analytics?.avgTimeToHire ?? 18
  const topSourceChannel = analytics?.topSource ?? "LinkedIn"
  const predictedHiresThisMonth = analytics?.predictedHires ?? 3

  if (isLoadingData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
              <div className="space-y-3 pt-2">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-8 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
              <Skeleton className="h-5 w-36" />
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {loadError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={() => loadAnalytics(true)} className="underline underline-offset-2 hover:no-underline">Retry</button>
        </div>
      )}
      <PageHeader
        title="Overview"
        description="Today's hiring snapshot"
        actions={
          <div className="flex items-center gap-2">
            {["7d", "30d", "90d"].map((range) => (
              <Button
                key={range}
                variant={selectedRange === parseInt(range) ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedRange(parseInt(range) as 7 | 30 | 90)}
              >
                {range}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => loadAnalytics(true)} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Jobs" value={liveKpi.totalJobs} trend={liveKpi.totalJobsTrend} detail={`Active: ${liveKpi.activeJobs} | Created in ${selectedRange}d: ${liveKpi.jobsInRange}`} icon={Briefcase} index={0} />
        <StatCard title="New Candidates" value={liveKpi.newCandidates} trend={liveKpi.newCandidatesTrend} icon={Users} index={1} />
        <StatCard title="Assessments Scheduled" value={liveKpi.assessmentsScheduled} trend={liveKpi.assessmentsTrend} icon={ClipboardCheck} index={2} />
        <StatCard title="Offers Extended" value={liveKpi.offersExtended} trend={liveKpi.offersTrend} icon={Gift} index={3} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-white/5" />
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI-Powered Insights</h3>
                <p className="text-sm text-muted-foreground">Real-time hiring intelligence</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 backdrop-blur-sm">
                <Zap className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg. Time to Hire</p>
                  <p className="text-lg font-bold text-foreground">{avgTimeToHire} days</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 backdrop-blur-sm">
                <Target className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Top Source</p>
                  <p className="text-lg font-bold text-foreground">{topSourceChannel}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 backdrop-blur-sm">
                <Award className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Predicted Hires</p>
                  <p className="text-lg font-bold text-foreground">{predictedHiresThisMonth} this month</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 backdrop-blur-sm">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Offer Accept Rate</p>
                  <p className="text-lg font-bold text-foreground">87%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Hiring Pipeline</CardTitle>
              <CardDescription>Candidate flow through stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelDataWithPercentage.map((item, index) => (
                  <motion.div key={item.stage} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">{item.stage}</span>
                      <span className="text-sm font-bold text-foreground">{item.count}</span>
                    </div>
                    <div className="relative h-8 bg-muted/50 rounded-lg overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                        className="absolute inset-y-0 left-0 rounded-lg transition-all group-hover:brightness-110"
                        style={{ backgroundColor: item.color, minWidth: item.count > 0 ? "32px" : "0px" }}
                      />
                      {index > 0 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {Math.round((item.count / funnelDataWithPercentage[index - 1].count) * 100)}% from prev
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overall Conversion</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">
                      {livePipeline.length >= 2 ? ((livePipeline[livePipeline.length - 1]?.count / livePipeline[0]?.count) * 100).toFixed(1) : "0.0"}%
                    </span>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +2.1%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Candidates Over Time</CardTitle>
              <CardDescription>Applications by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.candidatesOverTime || []}>
                    <defs>
                      <linearGradient id="colorEngineering" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDesign" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorData" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" tick={{ fill: "#9ca3af" }} fontSize={12} />
                    <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af" }} fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--popover-foreground))" }} />
                    <Legend />
                    <Area type="monotone" dataKey="Engineering" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorEngineering)" />
                    <Area type="monotone" dataKey="Design" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorDesign)" />
                    <Area type="monotone" dataKey="Data" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorData)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/jobs"><Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-colors"><Plus className="h-5 w-5 text-primary" /><span>Post New Job</span></Button></Link>
              <Link href="/send-links"><Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-blue-500/5 hover:border-blue-500/50 transition-colors"><ClipboardCheck className="h-5 w-5 text-blue-500" /><span>Send Assessment</span></Button></Link>
              <Link href="/interviews"><Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-purple-500/5 hover:border-purple-500/50 transition-colors"><Clock className="h-5 w-5 text-purple-500" /><span>Schedule Interview</span></Button></Link>
              <Link href="/candidates"><Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-amber-500/5 hover:border-amber-500/50 transition-colors"><Users className="h-5 w-5 text-amber-500" /><span>View Candidates</span></Button></Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
              <CardDescription>Latest updates from your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {liveActivities.slice(0, 5).map((activity: any, index: number) => {
                  const IconComponent = activityIcons[activity.action] || Clock
                  const desc = activity.candidate?.name
                    ? `${activity.candidate.name} — ${(activity.action || "").replace(/_/g, " ")}`
                    : (activity.action || "").replace(/_/g, " ")
                  return (
                    <motion.div key={activity.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="flex items-start gap-4 group">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                        <IconComponent className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm text-foreground capitalize">{desc}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}>
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium">Top Active Jobs</CardTitle>
                <CardDescription>Most applications received</CardDescription>
              </div>
              <Link href="/jobs"><Button variant="ghost" size="sm">View All</Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topJobs.map((job: any, index: number) => (
                  <motion.div key={job.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                    <Link href={`/jobs/${job.id}`}>
                      <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.department}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{job._count?.candidates ?? job.totalApplications ?? 0}</p>
                          <p className="text-xs text-muted-foreground">applicants</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
