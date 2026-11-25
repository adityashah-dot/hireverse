"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, Calendar, Clock, ExternalLink, Send, Search, Sparkles, Brain, BarChart2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table"
import { StageBadge } from "@/components/stage-badge"
import { candidatesApi, jobsApi, assessmentsApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Props {
  initialCandidates?: any[]
  initialJobs?: any[]
  initialAssessments?: any[]
}

export default function AssessmentsClient({ initialCandidates, initialJobs, initialAssessments }: Props) {
  const { toast } = useToast()
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filter, setFilter] = useState({ status: "all", job: "all" })
  const [search, setSearch] = useState("")
  const [candidates, setCandidates] = useState<any[]>(initialCandidates ?? [])
  const [jobs, setJobs] = useState<any[]>(initialJobs ?? [])
  const [assessments, setAssessments] = useState<any[]>(initialAssessments ?? [])
  const [isLoading, setIsLoading] = useState(!initialCandidates)
  const [selectedCandidate, setSelectedCandidate] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [questionCount, setQuestionCount] = useState(20)
  const [duration, setDuration] = useState(60)
  const [useCandidateContext, setUseCandidateContext] = useState(true)
  const [difficultyMix, setDifficultyMix] = useState<'balanced' | 'easy' | 'hard'>('balanced')

  const normalizeAssessments = (rows: any[]) =>
    rows.map((a: any) => ({
      ...a,
      candidateName: a.candidate?.name || a.candidateName || "",
      candidateId: a.candidate?.id || a.candidateId,
      jobTitle: a.candidate?.job?.title || a.jobTitle || "",
      jobId: a.candidate?.job?.id || a.jobId,
    }))

  const loadAssessments = () => {
    fetch("/api/assessments?limit=100")
      .then((r) => r.json())
      .then((res) => setAssessments(normalizeAssessments(res.data || [])))
      .catch((err) => {
        console.error('Reload assessments error:', err)
        toast({ title: "Failed to refresh assessments", variant: "destructive" })
      })
  }

  useEffect(() => {
    if (initialCandidates && initialJobs && initialAssessments) return
    Promise.all([
      candidatesApi.list({ limit: "100" }),
      jobsApi.list(),
      fetch("/api/assessments?limit=100").then((r) => r.json()),
    ])
      .then(([cRes, jRes, aRes]) => {
        setCandidates(cRes.data || [])
        setJobs(jRes.data || [])
        setAssessments(normalizeAssessments(aRes.data || []))
      })
      .catch((err) => {
        console.error('Assessments load error:', err)
        toast({ title: "Failed to load assessments", variant: "destructive" })
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredAssessments = assessments.filter((assessment) => {
    if (filter.status !== "all" && assessment.status?.toLowerCase() !== filter.status.toLowerCase()) return false
    if (filter.job !== "all" && assessment.jobId !== filter.job) return false
    if (search && !assessment.candidateName?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleScheduleAssessment = async () => {
    if (!selectedCandidate) {
      toast({ title: "Select a candidate", variant: "destructive" })
      return
    }
    setIsSending(true)
    try {
      const candidate = candidates.find((c) => c.id === selectedCandidate)
      const focusTopics = candidate?.job?.skills || []
      const difficultyMixPayload =
        difficultyMix === 'easy' ? { easy: 60, medium: 30, hard: 10 } :
        difficultyMix === 'hard' ? { easy: 10, medium: 30, hard: 60 } :
        { easy: 30, medium: 50, hard: 20 }

      await assessmentsApi.send({
        candidateId: selectedCandidate,
        questionCount,
        duration,
        expiresInHours: 48,
        useCandidateContext,
        focusTopics: focusTopics.length > 0 ? focusTopics : undefined,
        difficultyMix: difficultyMixPayload,
      })
      setIsDialogOpen(false)
      setSelectedCandidate("")
      setQuestionCount(20)
      setDuration(60)
      loadAssessments()
      toast({ title: "Assessment queued", description: "Questions are being generated — the candidate will receive the invite email within a minute." })
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  const columns = [
    {
      key: "candidateName",
      label: "Candidate",
      render: (assessment: (typeof assessments)[0]) => {
        const candidate = candidates.find((c) => c.id === assessment.candidateId)
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {assessment.candidateName.split(" ").map((n: string) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{assessment.candidateName}</p>
              <p className="text-xs text-muted-foreground">{candidate?.email}</p>
            </div>
          </div>
        )
      },
    },
    { key: "jobTitle", label: "Role", render: (a: any) => <span className="text-sm">{a.jobTitle}</span> },
    {
      key: "scheduledAt",
      label: "Scheduled",
      render: (a: any) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{new Date(a.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      ),
    },
    {
      key: "expiresAt",
      label: "Expires",
      render: (a: any) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{new Date(a.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      ),
    },
    { key: "status", label: "Status", render: (a: any) => <StageBadge status={a.status} animate={false} /> },
    {
      key: "score",
      label: "Score",
      render: (a: any) => a.score ? (
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-primary">{a.score}%</span>
          {a.duration && <span className="text-xs text-muted-foreground">({a.duration} min)</span>}
        </div>
      ) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "actions",
      label: "",
      render: (assessment: (typeof assessments)[0]) => (
        <div className="flex items-center gap-2">
          {assessment.status === "PENDING" && (
            <Button variant="ghost" size="sm" onClick={() => {
              assessmentsApi.send({ candidateId: assessment.candidateId })
                .then(() => { loadAssessments(); toast({ title: "Assessment resent" }) })
                .catch((err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }))
            }}>
              <Send className="h-4 w-4 mr-1" />Resend
            </Button>
          )}
          {assessment.status === "COMPLETED" ? (
            <Button variant="ghost" size="sm" onClick={() => router.push(`/assessments/${assessment.id}`)}>
              <BarChart2 className="h-4 w-4 mr-1" />Results
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => router.push(`/assessment/${assessment.sessionToken}`)}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-9 flex-1 max-w-sm" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b px-4 py-3 flex gap-4">
            {["Candidate", "Role", "Scheduled", "Expires", "Status", "Score"].map((h) => (
              <Skeleton key={h} className="h-3 w-16" />
            ))}
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assessments"
        description="Schedule and track candidate assessments"
        actions={<Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Schedule Assessment</Button>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Pending", value: assessments.filter((a) => a.status === "PENDING").length, color: "text-amber-500" },
          { label: "In Progress", value: assessments.filter((a) => a.status === "IN_PROGRESS").length, color: "text-purple-500" },
          { label: "Completed", value: assessments.filter((a) => a.status === "COMPLETED").length, color: "text-emerald-500" },
          { label: "Expired", value: assessments.filter((a) => a.status === "EXPIRED").length, color: "text-red-500" },
        ].map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by candidate name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter.status} onValueChange={(value) => setFilter({ ...filter, status: value })}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter.job} onValueChange={(value) => setFilter({ ...filter, job: value })}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Job" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable data={filteredAssessments} columns={columns} searchPlaceholder="Search assessments..." />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI-Powered Assessment
            </DialogTitle>
            <DialogDescription>Questions are dynamically generated by AI based on the job role, skills, and candidate profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Candidate</Label>
              <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                <SelectTrigger><SelectValue placeholder="Select candidate" /></SelectTrigger>
                <SelectContent>
                  {candidates
                    .filter((c) => !c.assessments || c.assessments.length === 0 || c.assessments[0]?.status === "COMPLETED")
                    .map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name} — {candidate.job?.title || "No role"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCandidate && (() => {
              const c = candidates.find((c) => c.id === selectedCandidate)
              return c?.job ? (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">AI will generate questions for:</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.job.title} — {c.job.experienceLevel}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(c.job.skills || []).slice(0, 6).map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                    {(c.job.skills || []).length > 6 && (
                      <Badge variant="secondary" className="text-xs">+{c.job.skills.length - 6} more</Badge>
                    )}
                  </div>
                </div>
              ) : null
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Questions</Label>
                <Select value={String(questionCount)} onValueChange={(v) => setQuestionCount(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 questions</SelectItem>
                    <SelectItem value="15">15 questions</SelectItem>
                    <SelectItem value="20">20 questions</SelectItem>
                    <SelectItem value="25">25 questions</SelectItem>
                    <SelectItem value="30">30 questions</SelectItem>
                    <SelectItem value="40">40 questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                    <SelectItem value="120">120 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficultyMix} onValueChange={(v: any) => setDifficultyMix(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy (60% easy, 30% medium, 10% hard)</SelectItem>
                  <SelectItem value="balanced">Balanced (30% easy, 50% medium, 20% hard)</SelectItem>
                  <SelectItem value="hard">Hard (10% easy, 30% medium, 60% hard)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Personalize with AI</Label>
                <p className="text-xs text-muted-foreground">Tailor questions to candidate's skills &amp; gaps</p>
              </div>
              <Switch checked={useCandidateContext} onCheckedChange={setUseCandidateContext} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleScheduleAssessment} disabled={isSending}>
              {isSending ? <><Sparkles className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate &amp; Send</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
