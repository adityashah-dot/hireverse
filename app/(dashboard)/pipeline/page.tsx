"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { GripVertical, MoreHorizontal, Mail, Calendar, FileText, Trash2, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/page-header"
import { candidatesApi, jobsApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type PipelineStage =
  | "APPLIED"
  | "SCREENING"
  | "SHORTLISTED"
  | "ASSESSMENT_SENT"
  | "ASSESSMENT_DONE"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED"

interface PipelineCandidate {
  id: string
  name: string
  email: string
  role: string
  skillMatch: number
  assessmentScore?: number
  stage: PipelineStage
  needsReview?: boolean
}

const stageConfig: Record<PipelineStage, { label: string; color: string; bgColor: string }> = {
  APPLIED: { label: "Applied", color: "bg-slate-500", bgColor: "bg-slate-500/10" },
  SCREENING: { label: "Screening", color: "bg-slate-400", bgColor: "bg-slate-400/10" },
  SHORTLISTED: { label: "Shortlisted", color: "bg-blue-500", bgColor: "bg-blue-500/10" },
  ASSESSMENT_SENT: { label: "Assessment Sent", color: "bg-amber-500", bgColor: "bg-amber-500/10" },
  ASSESSMENT_DONE: { label: "Assessment Done", color: "bg-amber-600", bgColor: "bg-amber-600/10" },
  INTERVIEW: { label: "Interview", color: "bg-purple-500", bgColor: "bg-purple-500/10" },
  OFFER: { label: "Offer", color: "bg-emerald-500", bgColor: "bg-emerald-500/10" },
  HIRED: { label: "Hired", color: "bg-emerald-600", bgColor: "bg-emerald-600/10" },
  REJECTED: { label: "Rejected", color: "bg-red-500", bgColor: "bg-red-500/10" },
}

const activeStages: PipelineStage[] = [
  "APPLIED", "SCREENING", "SHORTLISTED", "ASSESSMENT_SENT", "ASSESSMENT_DONE",
  "INTERVIEW", "OFFER", "HIRED",
]

const rejectedStage: PipelineStage = "REJECTED"

export default function PipelinePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [filter, setFilter] = useState("all")
  const [jobs, setJobs] = useState<any[]>([])
  const [candidatesByStage, setCandidatesByStage] = useState<Record<PipelineStage, PipelineCandidate[]>>({
    APPLIED: [], SCREENING: [], SHORTLISTED: [], ASSESSMENT_SENT: [], ASSESSMENT_DONE: [],
    INTERVIEW: [], OFFER: [], HIRED: [], REJECTED: [],
  })
  const [showRejected, setShowRejected] = useState(false)

  useEffect(() => {
    jobsApi.list({ status: "ACTIVE" }).then((res) => setJobs(res.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (filter !== "all") params.jobId = filter
    candidatesApi.list(params).then((res) => {
      const grouped: Record<PipelineStage, PipelineCandidate[]> = {
        APPLIED: [], SCREENING: [], SHORTLISTED: [], ASSESSMENT_SENT: [], ASSESSMENT_DONE: [],
        INTERVIEW: [], OFFER: [], HIRED: [], REJECTED: [],
      }
      ;(res.data || []).forEach((c: any) => {
        const stage = (c.stage as PipelineStage) || "APPLIED"
        if (grouped[stage]) {
          grouped[stage].push({
            id: c.id,
            name: c.name,
            email: c.email,
            role: c.job?.title || "",
            skillMatch: c.skillMatch || 0,
            assessmentScore: c.assessments?.[0]?.score ?? undefined,
            stage,
            needsReview: c.resumeParsed && !c.aiReviewed,
          })
        }
      })
      setCandidatesByStage(grouped)
    }).catch(() => {})
  }, [filter])

  const [draggedCandidate, setDraggedCandidate] = useState<PipelineCandidate | null>(null)
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null)

  const handleDragStart = (e: React.DragEvent, candidate: PipelineCandidate) => {
    setDraggedCandidate(candidate)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", candidate.id)
  }

  const handleDragOver = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverStage !== stage) setDragOverStage(stage)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverStage(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault()
    if (!draggedCandidate) return
    const sourceStage = draggedCandidate.stage

    if (sourceStage !== targetStage) {
      setCandidatesByStage((prev) => {
        const newState = { ...prev }
        newState[sourceStage] = prev[sourceStage].filter((c) => c.id !== draggedCandidate.id)
        const updatedCandidate = { ...draggedCandidate, stage: targetStage }
        newState[targetStage] = [...prev[targetStage], updatedCandidate]
        return newState
      })
      candidatesApi.updateStage(draggedCandidate.id, targetStage).catch(() => {
        setCandidatesByStage((prev) => {
          const newState = { ...prev }
          newState[targetStage] = prev[targetStage].filter((c) => c.id !== draggedCandidate.id)
          newState[sourceStage] = [...prev[sourceStage], draggedCandidate]
          return newState
        })
        toast({ title: "Failed to update stage", variant: "destructive" })
      })
      toast({
        title: "Candidate moved",
        description: `${draggedCandidate.name} → ${stageConfig[targetStage].label}`,
      })
    }

    setDraggedCandidate(null)
    setDragOverStage(null)
  }

  const handleDragEnd = () => {
    setDraggedCandidate(null)
    setDragOverStage(null)
  }

  const handleSendEmail = (candidate: PipelineCandidate) => {
    router.push(`/send-links?candidateId=${candidate.id}&type=email`)
  }

  const handleScheduleInterview = (candidate: PipelineCandidate) => {
    router.push(`/send-links?candidateId=${candidate.id}&type=interview`)
  }

  const handleSendAssessment = (candidate: PipelineCandidate) => {
    router.push(`/send-links?candidateId=${candidate.id}&type=assessment`)
  }

  const renderCandidateCard = (candidate: PipelineCandidate) => (
    <motion.div
      key={candidate.id}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      draggable
      onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, candidate)}
      onDragEnd={handleDragEnd}
      className={cn(
        "cursor-grab active:cursor-grabbing select-none",
        draggedCandidate?.id === candidate.id && "opacity-50 scale-95",
      )}
    >
      <Card className="group border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors mt-1">
              <GripVertical className="h-4 w-4" />
            </div>
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {candidate.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="cursor-pointer" onClick={() => router.push(`/candidates/${candidate.id}`)}>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-foreground truncate text-sm hover:text-primary transition-colors">
                      {candidate.name}
                    </p>
                    {candidate.needsReview && (
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{candidate.role}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleSendEmail(candidate)}>
                      <Mail className="mr-2 h-4 w-4" /> Send Email
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleScheduleInterview(candidate)}>
                      <Calendar className="mr-2 h-4 w-4" /> Schedule Interview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendAssessment(candidate)}>
                      <FileText className="mr-2 h-4 w-4" /> Send Assessment
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => {
                      candidatesApi.updateStage(candidate.id, "REJECTED").then(() => {
                        setCandidatesByStage((prev) => {
                          const newState = { ...prev }
                          newState[candidate.stage] = prev[candidate.stage].filter((c) => c.id !== candidate.id)
                          newState["REJECTED"] = [...prev["REJECTED"], { ...candidate, stage: "REJECTED" as PipelineStage }]
                          return newState
                        })
                        toast({ title: "Candidate rejected", description: candidate.name })
                      }).catch(() => toast({ title: "Failed to reject", variant: "destructive" }))
                    }}>
                      <Trash2 className="mr-2 h-4 w-4" /> Reject
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1">
                  <Progress value={candidate.skillMatch} className="h-1.5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{candidate.skillMatch}%</span>
              </div>
              {candidate.assessmentScore != null && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xs text-muted-foreground">Score:</span>
                  <span className="text-xs font-medium text-primary">{candidate.assessmentScore}%</span>
                </div>
              )}
              {candidate.needsReview && (
                <Badge variant="secondary" className="mt-1.5 bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]">
                  AI needs review
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pipeline"
        description="Drag and drop candidates between stages"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRejected(!showRejected)}>
              {showRejected ? "Hide Rejected" : `Show Rejected (${candidatesByStage["REJECTED"].length})`}
            </Button>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map((job: any) => (
                  <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Active stages Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6">
        {activeStages.map((stage, stageIndex) => {
          const config = stageConfig[stage]
          const stageCandidates = candidatesByStage[stage]
          return (
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stageIndex * 0.03 }}
              className={cn(
                "flex-shrink-0 w-64 rounded-2xl transition-all duration-200",
                dragOverStage === stage && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]",
              )}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className={cn("flex items-center justify-between p-3 mb-3 rounded-xl", config.bgColor)}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", config.color)} />
                  <h3 className="font-medium text-foreground text-sm">{config.label}</h3>
                  <span className="flex items-center justify-center h-5 px-2 text-xs font-medium rounded-full bg-background/80 text-muted-foreground">
                    {stageCandidates.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2 min-h-[300px] p-1">
                <AnimatePresence mode="popLayout">
                  {stageCandidates.map(renderCandidateCard)}
                </AnimatePresence>
                {stageCandidates.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={cn(
                      "flex items-center justify-center h-24 rounded-xl border-2 border-dashed transition-colors",
                      dragOverStage === stage ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <p className="text-xs text-muted-foreground">Drop here</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Rejected stage — collapsible */}
      {showRejected && (
        <div className="border-t border-border pt-6">
          <div className={cn("flex items-center gap-2 mb-3", stageConfig["REJECTED"].bgColor, "p-3 rounded-xl inline-flex")}>
            <div className={cn("w-2.5 h-2.5 rounded-full", stageConfig["REJECTED"].color)} />
            <h3 className="font-medium text-foreground text-sm">Rejected</h3>
            <span className="flex items-center justify-center h-5 px-2 text-xs font-medium rounded-full bg-background/80 text-muted-foreground">
              {candidatesByStage["REJECTED"].length}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto">
            <AnimatePresence mode="popLayout">
              {candidatesByStage["REJECTED"].map(renderCandidateCard)}
            </AnimatePresence>
            {candidatesByStage["REJECTED"].length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No rejected candidates</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
