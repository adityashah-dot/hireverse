"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { LayoutGrid, List, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table"
import { StageBadge } from "@/components/stage-badge"
import { SkillBadge } from "@/components/skill-badge"
import { candidatesApi, jobsApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

type ViewMode = "table" | "card"

interface Props {
  initialCandidates?: any[]
  initialJobs?: any[]
}

export default function CandidatesClient({ initialCandidates, initialJobs }: Props) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({ job: "all", stage: "all", assessment: "all" })
  const [candidates, setCandidates] = useState<any[]>(initialCandidates ?? [])
  const [jobs, setJobs] = useState<any[]>(initialJobs ?? [])
  const [isLoading, setIsLoading] = useState(!initialCandidates)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    // Skip initial fetch when server pre-populated data
    if (initialCandidates && initialJobs) return
    setLoadError(null)
    Promise.all([candidatesApi.list(), jobsApi.list()])
      .then(([cRes, jRes]) => { setCandidates(cRes.data); setJobs(jRes.data) })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load candidates'
        setLoadError(message)
        console.error('Candidates load error:', err)
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredCandidates = candidates.filter((candidate) => {
    if (filters.job !== "all" && candidate.jobId !== filters.job) return false
    if (filters.stage !== "all" && candidate.stage !== filters.stage) return false
    if (filters.assessment !== "all" && (candidate.assessments?.[0]?.status || "") !== filters.assessment) return false
    if (search && !candidate.name.toLowerCase().includes(search.toLowerCase()) && !candidate.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const tableColumns = [
    {
      key: "name",
      label: "Candidate",
      render: (candidate: (typeof candidates)[0]) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {candidate.name.split(" ").map((n: string) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{candidate.name}</p>
            <p className="text-xs text-muted-foreground">{candidate.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Applied Role",
      render: (candidate: (typeof candidates)[0]) => <span className="text-sm">{candidate.job?.title || ""}</span>,
    },
    {
      key: "skillMatch",
      label: "Skill Match",
      render: (candidate: (typeof candidates)[0]) => (
        <div className="flex items-center gap-2">
          <Progress value={candidate.skillMatch} className="w-20 h-2" />
          <span className="text-sm font-medium w-10">{candidate.skillMatch}%</span>
        </div>
      ),
    },
    {
      key: "assessment",
      label: "Assessment",
      render: (candidate: (typeof candidates)[0]) => {
        const assessment = candidate.assessments?.[0]
        return (
          <div className="flex items-center gap-2">
            <StageBadge status={assessment?.status} animate={false} />
            {assessment?.score != null && <span className="text-sm font-medium text-primary">{assessment.score}%</span>}
          </div>
        )
      },
    },
    {
      key: "stage",
      label: "Stage",
      render: (candidate: (typeof candidates)[0]) => <StageBadge stage={candidate.stage} animate={false} />,
    },
    {
      key: "updatedAt",
      label: "Last Updated",
      render: (candidate: (typeof candidates)[0]) => (
        <span className="text-sm text-muted-foreground">{new Date(candidate.updatedAt).toLocaleDateString()}</span>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-9 flex-1 max-w-sm" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b px-4 py-3 flex gap-4">
            {["Candidate", "Applied Role", "Skill Match", "Assessment", "Stage", "Last Updated"].map((h) => (
              <Skeleton key={h} className="h-3 w-20" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-3 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-20 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {loadError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError} — <button onClick={() => window.location.reload()} className="underline underline-offset-2">Retry</button>
        </div>
      )}
      <PageHeader
        title="Candidates"
        description="Manage all your candidates in one place"
        actions={
          <div className="flex items-center gap-2">
            <Button variant={viewMode === "table" ? "default" : "outline"} size="icon" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "card" ? "default" : "outline"} size="icon" onClick={() => setViewMode("card")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filters.job} onValueChange={(value) => setFilters({ ...filters, job: value })}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Jobs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.stage} onValueChange={(value) => setFilters({ ...filters, stage: value })}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="APPLIED">Applied</SelectItem>
            <SelectItem value="SCREENING">Screening</SelectItem>
            <SelectItem value="SHORTLISTED">Shortlisted</SelectItem>
            <SelectItem value="ASSESSMENT_SENT">Assessment Sent</SelectItem>
            <SelectItem value="ASSESSMENT_DONE">Assessment Done</SelectItem>
            <SelectItem value="INTERVIEW">Interview</SelectItem>
            <SelectItem value="OFFER">Offer</SelectItem>
            <SelectItem value="HIRED">Hired</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.assessment} onValueChange={(value) => setFilters({ ...filters, assessment: value })}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Assessment Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assessments</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {viewMode === "table" ? (
        <DataTable data={filteredCandidates} columns={tableColumns} searchPlaceholder="Search candidates..." onRowClick={(candidate) => router.push(`/candidates/${candidate.id}`)} selectable />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredCandidates.map((candidate, index) => (
              <motion.div key={candidate.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, delay: index * 0.03 }} onClick={() => router.push(`/candidates/${candidate.id}`)}>
                <Card className="group cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <motion.div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-5 relative">
                    <div className="flex items-start gap-3 mb-4">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {candidate.name.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{candidate.job?.title || ""}</p>
                      </div>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Skill Match</span>
                          <span className="font-medium">{candidate.skillMatch}%</span>
                        </div>
                        <Progress value={candidate.skillMatch} className="h-1.5" />
                      </div>
                      {candidate.assessments?.[0]?.score != null && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Assessment</span>
                            <span className="font-medium text-primary">{candidate.assessments[0].score}%</span>
                          </div>
                          <Progress value={candidate.assessments[0].score} className="h-1.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {(candidate.matchingSkills || []).slice(0, 3).map((skill: string) => <SkillBadge key={skill} skill={skill} />)}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <StageBadge stage={candidate.stage} />
                      <span className="text-xs text-muted-foreground">{candidate.location}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
