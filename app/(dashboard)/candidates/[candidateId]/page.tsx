"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  FileCheck,
  User,
  Send,
  Briefcase,
  Sparkles,
  CheckCircle,
  XCircle,
  GraduationCap,
  Linkedin,
  FileText,
  Clock,
  Download,
  Eye,
  EyeOff,
  RotateCw,
  Save,
  PenLine,
  AlertTriangle,
  Building,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { StageBadge } from "@/components/stage-badge"
import { SkillBadge } from "@/components/skill-badge"
import { candidatesApi, assessmentsApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"

const stages = ["APPLIED", "SCREENING", "SHORTLISTED", "ASSESSMENT_SENT", "ASSESSMENT_DONE", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]
const stageLabels: Record<string, string> = {
  APPLIED: "Applied", SCREENING: "Screening", SHORTLISTED: "Shortlisted",
  ASSESSMENT_SENT: "Assessment Sent", ASSESSMENT_DONE: "Assessment Done",
  INTERVIEW: "Interview", OFFER: "Offer", HIRED: "Hired", REJECTED: "Rejected",
}

export default function CandidateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const [candidate, setCandidate] = useState<any>(null)
  const [resumeText, setResumeText] = useState<string | null>(null)
  const [showResumeText, setShowResumeText] = useState(false)
  const [candidateAssessments, setCandidateAssessments] = useState<any[]>([])
  const [timelineEvents, setTimelineEvents] = useState<any[]>([])
  const [currentStage, setCurrentStage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [noteText, setNoteText] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)
  const noteRef = React.useRef<HTMLDivElement>(null)

  const [isReparsing, setIsReparsing] = useState(false)
  const [isApprovingAi, setIsApprovingAi] = useState(false)
  const [editMode, setEditMode] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  useEffect(() => {
    const id = params.candidateId as string
    setLoadError(null)
    Promise.all([
      candidatesApi.get(id),
      candidatesApi.getTimeline(id),
    ])
      .then(async ([cRes, tRes]) => {
        setCandidate(cRes.data)
        setCurrentStage(cRes.data?.stage || "")
        setCandidateAssessments(cRes.data?.assessments || [])
        setTimelineEvents(tRes.data || [])

        if (cRes.data?.resumeText) {
          setResumeText(cRes.data.resumeText)
        } else {
          try {
            const textRes = await fetch(`/api/candidates/${id}/resume-text`)
            if (textRes.ok) {
              const textData = await textRes.json()
              if (textData.text) setResumeText(textData.text)
            }
          } catch {}
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load candidate'
        setLoadError(message)
        console.error('Candidate load error:', err)
      })
      .finally(() => setIsLoading(false))
  }, [params.candidateId])

  const getInitials = (name: string) =>
    name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()

  const handleStageChange = async (newStage: string) => {
    const previousStage = currentStage
    setCurrentStage(newStage)
    try {
      await candidatesApi.updateStage(candidate.id, newStage)
      toast({ title: "Stage updated", description: `${candidate.name} moved to ${stageLabels[newStage]}` })
    } catch {
      setCurrentStage(previousStage)
      toast({ title: "Failed to update stage", variant: "destructive" })
    }
  }

  const handleSaveNote = async () => {
    if (!noteText.trim()) return
    setIsSavingNote(true)
    try {
      await candidatesApi.addNote(candidate.id, noteText)
      setNoteText("")
      toast({ title: "Note saved" })
      const tRes = await candidatesApi.getTimeline(candidate.id)
      setTimelineEvents(tRes.data || [])
    } catch {
      toast({ title: "Failed to save note", variant: "destructive" })
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleScheduleAssessment = async () => {
    try {
      await assessmentsApi.send({ candidateId: candidate.id, questionCount: 25, duration: 60, expiresInHours: 48 })
      toast({ title: "Assessment sent", description: "Invitation has been sent to the candidate" })
    } catch (err: any) {
      toast({ title: "Failed to send assessment", description: err.message, variant: "destructive" })
    }
  }

  const handleReParseResume = async () => {
    if (!candidate.resumeUrl) {
      toast({ title: "No resume to parse", description: "Upload a resume first", variant: "destructive" })
      return
    }
    setIsReparsing(true)
    try {
      await candidatesApi.parseResume(candidate.id)
      toast({ title: "Resume re-parsed", description: "AI has re-analyzed the resume. Review the updated results below." })
      const updated = await candidatesApi.get(candidate.id)
      setCandidate(updated.data)
      if (updated.data?.resumeText) setResumeText(updated.data.resumeText)
      const tRes = await candidatesApi.getTimeline(candidate.id)
      setTimelineEvents(tRes.data || [])
    } catch (err: any) {
      toast({ title: "Re-parse failed", description: err.message, variant: "destructive" })
    } finally {
      setIsReparsing(false)
    }
  }

  const handleApproveAi = async (recommendedStage?: string) => {
    setIsApprovingAi(true)
    const stageToSet = recommendedStage || currentStage
    try {
      const updates: any = { aiReviewed: true, aiReviewNotes: null }
      if (recommendedStage && recommendedStage !== candidate.stage) {
        updates.stage = recommendedStage
        setCurrentStage(recommendedStage)
      }
      await fetch(`/api/candidates/${candidate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const updated = await candidatesApi.get(candidate.id)
      setCandidate(updated.data)
      const tRes = await candidatesApi.getTimeline(candidate.id)
      setTimelineEvents(tRes.data || [])
      toast({ title: "AI output approved", description: "Candidate profile updated with AI data" })
    } catch (err: any) {
      toast({ title: "Failed to approve", description: err.message, variant: "destructive" })
    } finally {
      setIsApprovingAi(false)
    }
  }

  const startEdit = (field: string, value: any) => {
    setEditMode(field)
    setEditValues({ [field]: value })
  }

  const cancelEdit = () => {
    setEditMode(null)
    setEditValues({})
  }

  const saveEdit = async (field: string) => {
    setIsSavingEdit(true)
    try {
      const value = editValues[field]
      await fetch(`/api/candidates/${candidate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      const updated = await candidatesApi.get(candidate.id)
      setCandidate(updated.data)
      setEditMode(null)
      setEditValues({})
      const tRes = await candidatesApi.getTimeline(candidate.id)
      setTimelineEvents(tRes.data || [])
      toast({ title: "Updated", description: `${field} has been saved` })
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—"
    try {
      return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short" })
    } catch {
      return d
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-6 space-y-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-2 rounded-xl border bg-card">
            <div className="border-b px-4 py-2 flex gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-md" />
              ))}
            </div>
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-lg text-destructive">{loadError}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-muted-foreground mb-4">Candidate not found</p>
        <Button variant="outline" onClick={() => router.push("/candidates")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Candidates
        </Button>
      </div>
    )
  }

  const job = candidate.job || null
  const latestAiInterview = (candidate.interviews || []).find((i: any) => i?.aiSession)
  const aiSession = latestAiInterview?.aiSession || null
  const parsedResume = candidate.resumeParsed || {}
  const candidateSkills = parsedResume.skills || []
  const candidateExperience = candidate.experience || []
  const candidateEducation = candidate.education || []
  const isAiReviewed = candidate.aiReviewed === true
  const recommendedStage =
    (candidate.skillMatch || 0) >= 70 ? "SHORTLISTED"
    : (candidate.skillMatch || 0) >= 40 ? "SCREENING"
    : null

  return (
    <div className="space-y-8">
      <Link
        href="/candidates"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Candidates
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{candidate.name}</h1>
              <StageBadge stage={currentStage || candidate.stage} />
              {!isAiReviewed && candidate.resumeParsed && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Needs Review
                </Badge>
              )}
              {isAiReviewed && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                  <CheckCircle className="h-3 w-3 mr-1" /> AI Reviewed
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{job?.title || ""}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(candidate.matchingSkills || []).slice(0, 4).map((skill: string) => (
                <SkillBadge key={skill} skill={skill} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleScheduleAssessment}>
            <Send className="mr-2 h-4 w-4" /> Schedule Assessment
          </Button>
          <Button variant="outline" size="sm" onClick={() => noteRef.current?.scrollIntoView({ behavior: "smooth" })}>
            <MessageSquare className="mr-2 h-4 w-4" /> Add Note
          </Button>
          <Select value={currentStage || candidate.stage} onValueChange={handleStageChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Move Stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage} value={stage}>{stageLabels[stage] || stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai-review" className="relative">
            AI Review
            {!isAiReviewed && candidate.resumeParsed && (
              <span className="ml-1.5 h-2 w-2 rounded-full bg-amber-500 inline-block" />
            )}
          </TabsTrigger>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {candidate.aiSummary && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="relative overflow-hidden border-border/50">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5" />
                    <CardHeader className="relative">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        AI Summary
                        <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-0 text-xs">Auto-generated</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                      {editMode === "aiSummary" ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editValues.aiSummary || ""}
                            onChange={(e) => setEditValues({ aiSummary: e.target.value })}
                            className="min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit("aiSummary")} disabled={isSavingEdit}>
                              {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="group relative">
                          <p className="text-muted-foreground leading-relaxed">{candidate.aiSummary}</p>
                          <Button
                            size="sm" variant="ghost"
                            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => startEdit("aiSummary", candidate.aiSummary)}
                          >
                            <PenLine className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Skills Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                          <span className="font-medium">Matching Skills</span>
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0">
                            {candidate.matchingSkills?.length || 0}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editMode === "matchingSkills" ? (
                            <div className="w-full space-y-2">
                              <Textarea
                                value={(editValues.matchingSkills || []).join(", ")}
                                onChange={(e) => setEditValues({ matchingSkills: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                                placeholder="Enter skills separated by commas"
                                className="min-h-[60px] text-sm"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => saveEdit("matchingSkills")} disabled={isSavingEdit}>
                                  {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="group relative w-full">
                              <div className="flex flex-wrap gap-2">
                                {(candidate.matchingSkills || []).map((skill: string) => (
                                  <Badge key={skill} variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                                    <CheckCircle className="h-3 w-3 mr-1" />{skill}
                                  </Badge>
                                ))}
                              </div>
                              <Button size="sm" variant="ghost" className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => startEdit("matchingSkills", candidate.matchingSkills || [])}>
                                <PenLine className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-amber-500" />
                          <span className="font-medium">Skills to Develop</span>
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-0">
                            {candidate.missingSkills?.length || 0}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 group relative">
                          {(candidate.missingSkills || []).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">{skill}</Badge>
                          ))}
                          {(!candidate.missingSkills || candidate.missingSkills.length === 0) && (
                            <p className="text-sm text-muted-foreground">All required skills present</p>
                          )}
                          <Button size="sm" variant="ghost" className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => startEdit("missingSkills", candidate.missingSkills || [])}>
                            <PenLine className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Work Experience */}
              {candidateExperience.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-border/50">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building className="h-5 w-5" />Work Experience</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {candidateExperience.map((exp: any, i: number) => (
                        <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Building className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground">{exp.title}</p>
                            <p className="text-xs text-muted-foreground">{exp.company}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(exp.startDate)} — {exp.isCurrent ? "Present" : formatDate(exp.endDate)}
                            </p>
                            {exp.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{exp.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Education */}
              {candidateEducation.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-border/50">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><GraduationCap className="h-5 w-5" />Education</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {candidateEducation.map((edu: any, i: number) => (
                        <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <GraduationCap className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground">{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</p>
                            <p className="text-xs text-muted-foreground">{edu.institution}</p>
                            <div className="flex gap-3 mt-0.5">
                              {edu.endDate && <p className="text-xs text-muted-foreground">{formatDate(edu.endDate)}</p>}
                              {edu.gpa && <p className="text-xs text-muted-foreground">GPA: {edu.gpa}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Profile Summary */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-lg">Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        <span>{candidateExperience[0]?.title || parsedResume.summary?.slice(0, 50) || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{candidate.location || parsedResume.location || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Applied {new Date(candidate.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {candidate.linkedIn && (
                      <a href={`https://${candidate.linkedIn}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                        <Linkedin className="h-4 w-4" /> View LinkedIn Profile
                      </a>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Notes */}
              <motion.div ref={noteRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-lg">Notes</CardTitle></CardHeader>
                  <CardContent>
                    <Textarea placeholder="Add a note..." className="min-h-[100px] mb-3" value={noteText}
                      onChange={(e) => setNoteText(e.target.value)} />
                    <Button size="sm" onClick={handleSaveNote} disabled={isSavingNote}>
                      <MessageSquare className="mr-2 h-4 w-4" />{isSavingNote ? "Saving..." : "Save Note"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-lg">Snapshot</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Skill Match</span>
                        <span className="font-semibold">{candidate.skillMatch ?? 0}%</span>
                      </div>
                      <Progress value={candidate.skillMatch ?? 0} className="h-2" />
                    </div>
                    {candidateAssessments.length > 0 && candidateAssessments[0]?.score !== null && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Assessment Score</span>
                          <span className="font-semibold text-primary">{candidateAssessments[0].score}%</span>
                        </div>
                        <Progress value={candidateAssessments[0].score ?? 0} className="h-2" />
                      </div>
                    )}
                    {aiSession?.finalScore != null && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">AI Interview</span>
                          <span className="font-semibold text-indigo-400">{Number(aiSession.finalScore).toFixed(1)}/100</span>
                        </div>
                        <Progress value={Number(aiSession.finalScore)} className="h-2" />
                      </div>
                    )}
                    {aiSession?.attentionScore != null && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Attention Score</span>
                          <span className="font-semibold text-cyan-400">{Number(aiSession.attentionScore).toFixed(1)}/100</span>
                        </div>
                        <Progress value={Number(aiSession.attentionScore)} className="h-2" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Current Stage</p>
                      <Select value={currentStage || candidate.stage} onValueChange={handleStageChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage} value={stage}>{stageLabels[stage]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-lg">Contact</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${candidate.email}`} className="text-primary hover:underline">{candidate.email}</a>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{candidate.phone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{candidate.location || "—"}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {job && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-border/50">
                    <CardHeader><CardTitle className="text-lg">Applied For</CardTitle></CardHeader>
                    <CardContent>
                      <Link href={`/jobs/${job.id}`} className="block group">
                        <div className="p-4 rounded-xl bg-muted/50 group-hover:bg-muted transition-colors">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">{job.title}</p>
                          <p className="text-sm text-muted-foreground">{job.department}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="bg-muted">{job.experienceLevel}</Badge>
                          </div>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-lg">All Skills</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {[...(candidate.matchingSkills || []), ...(candidate.missingSkills || []), ...(job?.skills || [])]
                        .filter((s: string, i: number, arr: string[]) => arr.indexOf(s) === i)
                        .map((skill: string) => (
                          <SkillBadge key={skill} skill={skill} />
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </TabsContent>

        {/* ── AI REVIEW TAB ── */}
        <TabsContent value="ai-review" className="space-y-6">
          {!candidate.resumeParsed ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No AI Data Yet</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                    The resume hasn&apos;t been processed by AI. Upload a resume first, then the AI will analyze it.
                  </p>
                  {candidate.resumeUrl && (
                    <Button onClick={handleReParseResume} disabled={isReparsing}>
                      {isReparsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      {isReparsing ? "Analyzing..." : "Analyze Resume with AI"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* Review status banner */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`border-2 ${isAiReviewed ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {isAiReviewed ? (
                        <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {isAiReviewed ? "AI Output Reviewed & Approved" : "AI Output Needs Your Review"}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isAiReviewed
                            ? "You have reviewed and approved the AI-generated data. The candidate profile is now using AI results."
                            : "The AI has analyzed this resume. Review the extracted data below, make any corrections, then approve to apply it to the candidate profile."}
                        </p>
                        {!isAiReviewed && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button size="sm" onClick={() => handleApproveAi()} disabled={isApprovingAi}>
                              {isApprovingAi ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                              Approve AI Output
                            </Button>
                            {recommendedStage && recommendedStage !== candidate.stage && (
                              <Button size="sm" variant="outline" onClick={() => handleApproveAi(recommendedStage)} disabled={isApprovingAi}>
                                Approve & Move to {stageLabels[recommendedStage]}
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={handleReParseResume} disabled={isReparsing}>
                              {isReparsing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCw className="h-4 w-4 mr-1" />}
                              Re-parse Resume
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Raw Resume Text vs Parsed Data */}
              <div className="grid gap-6 lg:grid-cols-2">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-border/50 h-full">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Eye className="h-5 w-5" /> Raw Resume Text
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setShowResumeText(!showResumeText)}>
                        {showResumeText ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                        {showResumeText ? "Hide" : "Show"}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {showResumeText ? (
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-[500px] overflow-y-auto bg-muted/30 rounded-lg p-4 leading-relaxed">
                          {resumeText || "No resume text extracted"}
                        </pre>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <FileText className="h-10 w-10 mb-2 opacity-30" />
                          <p className="text-sm">Click &quot;Show&quot; to view the raw resume text</p>
                          <p className="text-xs mt-1 opacity-50">
                            {resumeText ? `${resumeText.length.toLocaleString()} characters extracted` : "No text available"}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-border/50 h-full">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5" /> AI-Parsed Data
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs">Editable</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 rounded bg-muted/30">
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="font-medium">{parsedResume.name || "—"}</p>
                        </div>
                        <div className="p-2 rounded bg-muted/30">
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium text-xs truncate">{parsedResume.email || "—"}</p>
                        </div>
                        <div className="p-2 rounded bg-muted/30">
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium">{parsedResume.phone || "—"}</p>
                        </div>
                        <div className="p-2 rounded bg-muted/30">
                          <p className="text-xs text-muted-foreground">Location</p>
                          <p className="font-medium">{parsedResume.location || "—"}</p>
                        </div>
                        <div className="p-2 rounded bg-muted/30 col-span-2">
                          <p className="text-xs text-muted-foreground">Total Experience</p>
                          <p className="font-medium">
                            {parsedResume.totalYearsExperience
                              ? `${parsedResume.totalYearsExperience} years`
                              : "—"}
                          </p>
                        </div>
                      </div>

                      {parsedResume.summary && (
                        <div className="p-3 rounded bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">AI Summary</p>
                          <p className="text-sm leading-relaxed">{parsedResume.summary}</p>
                        </div>
                      )}

                      {candidateSkills.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Extracted Skills ({candidateSkills.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {candidateSkills.map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="bg-muted text-xs">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Skill Match Score - editable */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">AI Skill Match Score</CardTitle>
                    <span className={`text-2xl font-bold ${(candidate.skillMatch || 0) >= 70 ? "text-emerald-500" : (candidate.skillMatch || 0) >= 40 ? "text-amber-500" : "text-red-500"}`}>
                      {candidate.skillMatch ?? 0}%
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={candidate.skillMatch ?? 0} className="h-3" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {recommendedStage
                          ? `AI recommends: ${stageLabels[recommendedStage]}`
                          : "AI could not determine a recommended stage"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit("skillMatch", candidate.skillMatch)}>
                        <PenLine className="h-3.5 w-3.5 mr-1" /> Override Score
                      </Button>
                    </div>
                    {editMode === "skillMatch" && (
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number" min={0} max={100}
                          value={editValues.skillMatch ?? ""}
                          onChange={(e) => setEditValues({ skillMatch: parseInt(e.target.value) || 0 })}
                          className="w-24"
                        />
                        <Button size="sm" onClick={() => saveEdit("skillMatch")} disabled={isSavingEdit}>
                          {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </TabsContent>

        {/* ── RESUME TAB ── */}
        <TabsContent value="resume" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" />Resume</CardTitle>
                  <div className="flex gap-2">
                    {candidate.resumeUrl && (
                      <>
                        <Button variant="outline" size="sm" onClick={handleReParseResume} disabled={isReparsing}>
                          {isReparsing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCw className="h-4 w-4 mr-1" />}
                          {isReparsing ? "Parsing..." : "Re-parse"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(candidate.resumeUrl, "_blank")}>
                          <Download className="mr-2 h-4 w-4" /> Download
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {candidate.resumeUrl ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Resume uploaded</span>
                    </div>
                    {resumeText ? (
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-[600px] overflow-y-auto bg-muted/30 rounded-lg p-4 leading-relaxed">
                        {resumeText}
                      </pre>
                    ) : (
                      <div className="bg-muted/50 rounded-xl p-8 min-h-[200px] flex flex-col items-center justify-center">
                        <FileText className="h-10 w-10 text-muted-foreground mb-2 opacity-30" />
                        <p className="text-sm text-muted-foreground">Text extraction in progress or unavailable</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-xl p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No Resume Uploaded</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {candidate.name} has not uploaded a resume yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ── ASSESSMENT TAB ── */}
        <TabsContent value="assessment" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-lg">Assessment Results</CardTitle></CardHeader>
                  <CardContent>
                    {candidateAssessments.length > 0 ? (
                      <div className="space-y-4">
                        {candidateAssessments.map((assessment: any) => (
                          <div key={assessment.id} className="p-4 rounded-xl border border-border/50 bg-muted/30">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="font-medium">{job?.title || "Assessment"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {assessment.sentAt ? new Date(assessment.sentAt).toLocaleDateString("en-US", {
                                    month: "long", day: "numeric", year: "numeric",
                                  }) : "—"}
                                </p>
                              </div>
                              <StageBadge status={assessment.status} />
                            </div>
                            {assessment.score != null && (
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 rounded-lg bg-background">
                                  <p className="text-2xl font-semibold text-primary">{assessment.score}%</p>
                                  <p className="text-xs text-muted-foreground">Score</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-background">
                                  <p className="text-2xl font-semibold">{assessment.questionCount || "—"}</p>
                                  <p className="text-xs text-muted-foreground">Questions</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-background">
                                  <p className="text-2xl font-semibold text-emerald-600">
                                    {assessment.totalCorrect != null ? assessment.totalCorrect : "—"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Correct</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <FileCheck className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">No Assessments Yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">Schedule an assessment to evaluate this candidate</p>
                        <Button onClick={handleScheduleAssessment}>
                          <Send className="mr-2 h-4 w-4" /> Schedule Assessment
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full" variant="outline" onClick={handleScheduleAssessment}>
                      <Send className="mr-2 h-4 w-4" /> Send New Assessment
                    </Button>
                    <Button className="w-full" variant="outline" disabled>
                      <Clock className="mr-2 h-4 w-4" /> Extend Deadline
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </TabsContent>

        {/* ── ACTIVITY TAB ── */}
        <TabsContent value="activity" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-lg">Activity Timeline</CardTitle></CardHeader>
              <CardContent>
                {timelineEvents.length > 0 ? (
                  <div className="relative space-y-6">
                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                    {timelineEvents.map((event: any, index: number) => {
                      const action = event.action || ""
                      const details = typeof event.details === "object" ? event.details : {}
                      const needsReview = details?.needsReview
                      const recommendedStage = details?.recommendedStage
                      const description = [
                        recommendedStage && `Recommended: ${stageLabels[recommendedStage] || recommendedStage}`,
                        details?.skillMatch != null && `Match: ${details.skillMatch}%`,
                        details?.reason,
                      ].filter(Boolean).join(" · ") || action.replace(/_/g, " ")

                      const iconMap: Record<string, React.ReactNode> = {
                        stage: <ArrowLeft className="h-3.5 w-3.5 text-primary" style={{ transform: "rotate(135deg)" }} />,
                        note: <MessageSquare className="h-3.5 w-3.5 text-primary" />,
                        assessment: <FileCheck className="h-3.5 w-3.5 text-primary" />,
                        interview: <Calendar className="h-3.5 w-3.5 text-primary" />,
                        applied: <User className="h-3.5 w-3.5 text-primary" />,
                        resume: <Sparkles className="h-3.5 w-3.5 text-primary" />,
                      }

                      let icon: React.ReactNode = <User className="h-3.5 w-3.5 text-primary" />
                      if (action.includes("stage")) icon = iconMap.stage
                      else if (action.includes("note")) icon = iconMap.note
                      else if (action.includes("assessment")) icon = iconMap.assessment
                      else if (action.includes("interview")) icon = iconMap.interview
                      else if (action.includes("applied")) icon = iconMap.applied
                      else if (action.includes("resume")) icon = iconMap.resume

                      return (
                        <motion.div key={event.id || index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }} className="relative flex gap-4 pl-10">
                          <div className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border-4 border-background">
                            {icon}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-foreground capitalize">
                                {action.replace(/_/g, " ")}
                              </p>
                              {needsReview && (
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]">
                                  Needs Review
                                </Badge>
                              )}
                              {event.user?.name && (
                                <span className="text-xs text-muted-foreground">by {event.user.name}</span>
                              )}
                            </div>
                            {description !== action.replace(/_/g, " ") && (
                              <p className="text-sm text-muted-foreground">{description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(event.createdAt).toLocaleDateString("en-US", {
                                month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No Activity Yet</h3>
                    <p className="text-sm text-muted-foreground">Activity events will appear as the candidate progresses</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
