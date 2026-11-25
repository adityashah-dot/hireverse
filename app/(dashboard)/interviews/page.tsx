"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Clock,
  Video,
  Users,
  MapPin,
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Mic,
  Copy,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/page-header"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { interviewsApi } from "@/lib/api"

const statusConfig = {
  scheduled: { label: "Scheduled", color: "bg-blue-500", textColor: "text-blue-500" },
  completed: { label: "Completed", color: "bg-emerald-500", textColor: "text-emerald-500" },
  cancelled: { label: "Cancelled", color: "bg-red-500", textColor: "text-red-500" },
  "no-show": { label: "No Show", color: "bg-amber-500", textColor: "text-amber-500" },
}

export default function InterviewsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [interviews, setInterviews] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    interviewsApi.list()
      .then((res) => setInterviews(res.data || []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("upcoming")

  const getName = (i: any) => i.candidate?.name || i.candidateName || ""
  const getRole = (i: any) => i.candidate?.job?.title || i.role || ""
  const getDate = (i: any) => i.scheduledAt ? new Date(i.scheduledAt).toISOString().split("T")[0] : i.date || ""
  const getTime = (i: any) => i.scheduledAt ? new Date(i.scheduledAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : i.time || ""
  const getDuration = (i: any) => i.duration ? `${i.duration} min` : i.duration || "60 min"
  const getLocation = (i: any) => i.location || i.meetingLink || "Remote"
  const getInterviewers = (i: any) => {
    const list = Array.isArray(i.interviewerIds) ? i.interviewerIds : (i.interviewers || [])
    if (list.length > 0) return list
    if ((i.location || "").toLowerCase().includes("hireverse ai interview")) return ["Alex (AI)"]
    return []
  }
  const getStatus = (i: any) => (i.status || "").toLowerCase().replace("_", "-")
  const getCandidateId = (i: any) => i.candidateId || i.candidate?.id || ""
  const isAIInterview = (i: any) => (i.location || "").toLowerCase().includes("hireverse ai interview")

  const upcomingInterviews = interviews.filter((i) => getStatus(i) === "scheduled")
  const pastInterviews = interviews.filter((i) => getStatus(i) !== "scheduled")

  const filteredInterviews = (activeTab === "upcoming" ? upcomingInterviews : pastInterviews).filter(
    (interview) =>
      getName(interview).toLowerCase().includes(search.toLowerCase()) ||
      getRole(interview).toLowerCase().includes(search.toLowerCase()),
  )

  const handleSendReminder = async (interview: any) => {
    try {
      const candidateId = getCandidateId(interview)
      if (!candidateId) throw new Error("No candidate linked")
      toast({ title: "Reminder queued", description: `Email reminder will be sent to ${getName(interview)} (requires RESEND_API_KEY)` })
    } catch {
      toast({ title: "Cannot send reminder", description: "No candidate linked to this interview", variant: "destructive" })
    }
  }

  const handleCancelInterview = async (interview: any) => {
    try {
      await interviewsApi.cancel(interview.id)
      setInterviews((prev) => prev.filter((i) => i.id !== interview.id))
      toast({ title: "Interview cancelled", description: `Interview with ${getName(interview)} has been cancelled` })
    } catch {
      toast({ title: "Failed to cancel", variant: "destructive" })
    }
  }

  const handleJoinMeeting = (link: string) => {
    window.open(link, "_blank")
  }

  const copyAIInterviewLink = (interviewId: string) => {
    const link = `${window.location.origin}/ai-interview/${interviewId}`
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: "Link copied!", description: "AI interview link copied to clipboard. Send it to the candidate." })
    }).catch(() => {
      toast({ title: "Copy failed", description: link, variant: "destructive" })
    })
  }

  const todayInterviews = interviews.filter(
    (i) => getStatus(i) === "scheduled" && getDate(i) === new Date().toISOString().split("T")[0],
  )

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-36" />
              </div>
              <div className="space-y-1.5 text-right">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Interviews"
        description="Manage and track all scheduled interviews"
        actions={
          <Button onClick={() => router.push("/send-links?type=interview")}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Interview
          </Button>
        }
      />

      {/* Today's Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Today", value: todayInterviews.length, icon: Calendar, color: "text-primary" },
          { label: "This Week", value: upcomingInterviews.length, icon: Clock, color: "text-blue-500" },
          {
            label: "Completed",
            value: pastInterviews.filter((i) => getStatus(i) === "completed").length,
            icon: CheckCircle2,
            color: "text-emerald-500",
          },
          {
            label: "Cancelled",
            value: pastInterviews.filter((i) => getStatus(i) === "cancelled").length,
            icon: XCircle,
            color: "text-red-500",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("p-2 rounded-xl bg-muted", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcomingInterviews.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastInterviews.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search interviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredInterviews.map((interview, index) => {
          const statusKey = getStatus(interview) as keyof typeof statusConfig
          const status = statusConfig[statusKey] || { label: interview.status || "Unknown", color: "bg-gray-500", textColor: "text-gray-500" }
          return (
            <motion.div
              key={interview.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Candidate Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getName(interview).split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{getName(interview)}</p>
                        <p className="text-sm text-muted-foreground">{getRole(interview)}</p>
                        <Badge variant="secondary" className="mt-1">
                          {interview.type}
                        </Badge>
                      </div>
                    </div>

                    {/* Schedule Info */}
                    <div className="flex flex-wrap items-center gap-4 lg:gap-8">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {getDate(interview) ? new Date(getDate(interview)).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{getTime(interview)}</span>
                        <span className="text-muted-foreground">({getDuration(interview)})</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{getLocation(interview)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{getInterviewers(interview).join(", ") || "TBD"}</span>
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className={cn(status.color, "text-white border-0")}>
                        {status.label}
                      </Badge>
                      {getStatus(interview) === "scheduled" && interview.meetingLink && (
                        <Button size="sm" onClick={() => handleJoinMeeting(interview.meetingLink)}>
                          <Video className="h-4 w-4 mr-1" />
                          Join
                        </Button>
                      )}
                      {isAIInterview(interview) && getStatus(interview) === "scheduled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                          onClick={() => copyAIInterviewLink(interview.id)}
                        >
                          <Mic className="h-4 w-4 mr-1" />
                          AI Link
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/candidates/${getCandidateId(interview)}`)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Candidate
                          </DropdownMenuItem>
                          {isAIInterview(interview) && (
                            <DropdownMenuItem onClick={() => copyAIInterviewLink(interview.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy AI Interview Link
                            </DropdownMenuItem>
                          )}
                          {getStatus(interview) === "scheduled" && (
                            <>
                              <DropdownMenuItem onClick={() => handleSendReminder(interview)}>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Reminder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleCancelInterview(interview)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Interview
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Feedback for completed interviews */}
                  {getStatus(interview) === "completed" && (interview.feedback || interview.feedbacks?.length > 0) && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Feedback: </span>
                        {interview.feedback}
                      </p>
                    </div>
                  )}

                  {getStatus(interview) === "completed" && interview.aiSession && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                        <div className="rounded-lg bg-muted/40 px-3 py-2">
                          <p className="text-xs text-muted-foreground">Interview Score</p>
                          <p className="font-semibold text-foreground">
                            {interview.aiSession.finalScore != null ? `${Number(interview.aiSession.finalScore).toFixed(1)}/100` : 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-3 py-2">
                          <p className="text-xs text-muted-foreground">Eye Score</p>
                          <p className="font-semibold text-foreground">
                            {interview.aiSession.attentionScore != null ? `${Number(interview.aiSession.attentionScore).toFixed(1)}/100` : 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-3 py-2">
                          <p className="text-xs text-muted-foreground">Accuracy</p>
                          <p className="font-semibold text-foreground">
                            {interview.aiSession.passRate != null ? `${Number(interview.aiSession.passRate).toFixed(1)}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-3 py-2">
                          <p className="text-xs text-muted-foreground">Questions</p>
                          <p className="font-semibold text-foreground">
                            {interview.aiSession.questionsAnswered ?? 0} answered
                            {interview.aiSession.questionsPassed != null ? ` • ${interview.aiSession.questionsPassed} high-score` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}

        {filteredInterviews.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">No interviews found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === "upcoming"
                  ? "Schedule your first interview to get started"
                  : "No past interviews match your search"}
              </p>
              {activeTab === "upcoming" && (
                <Button className="mt-4" onClick={() => router.push("/send-links?type=interview")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Interview
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
