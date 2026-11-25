"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  DollarSign,
  Share2,
  Pencil,
  XCircle,
  Copy,
  ExternalLink,
  Users,
  FileCheck,
  Calendar,
  Building,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StageBadge } from "@/components/stage-badge"
import { SkillBadge } from "@/components/skill-badge"
import { DataTable } from "@/components/data-table"
import { jobsApi, candidatesApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  const [job, setJob] = useState<any>(null)
  const [jobCandidates, setJobCandidates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editJob, setEditJob] = useState({
    title: "",
    department: "",
    location: "",
    experienceLevel: "MID",
    description: "",
    skills: "",
    requirements: "",
    salaryMin: "",
    salaryMax: "",
  })

  useEffect(() => {
    const id = params.jobId as string
    Promise.all([jobsApi.get(id), candidatesApi.list({ jobId: id })])
      .then(([jRes, cRes]) => {
        setJob(jRes.data)
        setJobCandidates(cRes.data || [])
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [params.jobId])

  useEffect(() => {
    if (!job) return
    setEditJob({
      title: job.title || "",
      department: job.department || "",
      location: job.location || "",
      experienceLevel: job.experienceLevel || "MID",
      description: job.description || "",
      skills: Array.isArray(job.skills) ? job.skills.join(", ") : "",
      requirements: Array.isArray(job.requirements) ? job.requirements.join("\n") : "",
      salaryMin: job.salaryMin ? String(job.salaryMin) : "",
      salaryMax: job.salaryMax ? String(job.salaryMax) : "",
    })
  }, [job])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-muted-foreground mb-4">Job not found</p>
        <Button variant="outline" onClick={() => router.push("/jobs")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Button>
      </div>
    )
  }

  const getApplyPath = () => `/apply/${job.applicationCode || job.slug || job.id}`

  const handleCopyLink = async () => {
    try {
      const baseUrl = window.location.origin
      await navigator.clipboard.writeText(`${baseUrl}${getApplyPath()}`)
      toast({
        title: "Application link copied",
        description: "Job application link copied to clipboard",
      })
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" })
    }
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${getApplyPath()}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Apply for ${job.title}`,
          text: `Check out this role: ${job.title}`,
          url: shareUrl,
        })
        return
      } catch {
        // User may cancel native share; fallback to copy.
      }
    }
    await handleCopyLink()
  }

  const handleStatusUpdate = async (status: "ACTIVE" | "CLOSED") => {
    setIsUpdatingStatus(true)
    try {
      const res = await jobsApi.update(job.id, { status })
      setJob(res.data)
      toast({ title: status === "ACTIVE" ? "Job reactivated" : "Job closed" })
    } catch (err: any) {
      toast({
        title: status === "ACTIVE" ? "Failed to reactivate job" : "Failed to close job",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editJob.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" })
      return
    }
    if (editJob.description.trim().length < 50) {
      toast({ title: "Description must be at least 50 characters", variant: "destructive" })
      return
    }

    setIsSavingEdit(true)
    try {
      const res = await jobsApi.update(job.id, {
        title: editJob.title.trim(),
        department: editJob.department.trim(),
        location: editJob.location.trim(),
        experienceLevel: editJob.experienceLevel,
        description: editJob.description.trim(),
        skills: editJob.skills.split(",").map((s: string) => s.trim()).filter(Boolean),
        requirements: editJob.requirements.split("\n").map((s: string) => s.trim()).filter(Boolean),
        salaryMin: editJob.salaryMin ? parseInt(editJob.salaryMin) : undefined,
        salaryMax: editJob.salaryMax ? parseInt(editJob.salaryMax) : undefined,
      })
      setJob(res.data)
      setIsEditOpen(false)
      toast({ title: "Job updated", description: "Changes saved successfully." })
    } catch (err: any) {
      toast({ title: "Failed to update job", description: err.message, variant: "destructive" })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const candidateColumns = [
    {
      key: "name",
      label: "Candidate",
      render: (candidate: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {candidate.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
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
      key: "skillMatch",
      label: "Skill Match",
      render: (candidate: any) => (
        <div className="flex items-center gap-2">
          <Progress value={candidate.skillMatch} className="w-16 h-2" />
          <span className="text-sm font-medium">{candidate.skillMatch}%</span>
        </div>
      ),
    },
    {
      key: "assessment",
      label: "Assessment",
      render: (candidate: any) => <StageBadge status={candidate.assessments?.[0]?.status} animate={false} />,
    },
    {
      key: "stage",
      label: "Stage",
      render: (candidate: any) => <StageBadge stage={candidate.stage} animate={false} />,
    },
    {
      key: "updatedAt",
      label: "Last Updated",
      render: (candidate: any) => (
        <span className="text-sm text-muted-foreground">{new Date(candidate.updatedAt).toLocaleDateString()}</span>
      ),
    },
  ]

  const assessmentColumns = [
    {
      key: "candidateName",
      label: "Candidate",
      render: (assessment: any) => <span className="font-medium">{assessment.candidateName}</span>,
    },
    {
      key: "scheduledAt",
      label: "Scheduled",
      render: (assessment: any) => (
        <span className="text-sm">
          {new Date(assessment.scheduledAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (assessment: any) => <StageBadge status={assessment.status} animate={false} />,
    },
    {
      key: "score",
      label: "Score",
      render: (assessment: any) =>
        assessment.score ? (
          <span className="font-medium text-primary">{assessment.score}%</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <div className="space-y-8">
      {/* Back button */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{job.title}</h1>
            <StageBadge status={job.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Building className="h-4 w-4" />
              {job.department}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {job.location}
            </div>
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" />
              {job.experienceLevel}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Created {new Date(job.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {job.status === "ACTIVE" ? (
            <Button variant="destructive" size="sm" onClick={() => handleStatusUpdate("CLOSED")} disabled={isUpdatingStatus}>
              <XCircle className="mr-2 h-4 w-4" />
              {isUpdatingStatus ? "Updating..." : "Close Job"}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => handleStatusUpdate("ACTIVE")} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? "Updating..." : "Reactivate"}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="candidates">Candidates ({jobCandidates.length})</TabsTrigger>
          <TabsTrigger value="assessments">Assessments ({jobCandidates.flatMap((c: any) => c.assessments || []).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{job.description}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {job.requirements.map((req: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <span className="text-muted-foreground">{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Required Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill: string) => (
                      <SkillBadge key={skill} skill={skill} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Total Candidates</span>
                    </div>
                    <span className="font-semibold">{jobCandidates.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileCheck className="h-4 w-4" />
                      <span>Assessments Done</span>
                    </div>
                    <span className="font-semibold">
                      {jobCandidates.flatMap((c: any) => c.assessments || []).filter((a: any) => a.status === "completed").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Salary Range</span>
                    </div>
                    <span className="font-semibold text-sm">{job.salaryRange}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Application Link</CardTitle>
                  <CardDescription>Share this link with candidates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg truncate">
                      {typeof window !== "undefined" ? `${window.location.origin}${getApplyPath()}` : ""}
                    </code>
                    <Button variant="outline" size="icon" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => window.open(getApplyPath(), "_blank")}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="candidates">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <DataTable
              data={jobCandidates}
              columns={candidateColumns}
              searchPlaceholder="Search candidates..."
              onRowClick={(candidate) => router.push(`/candidates/${candidate.id}`)}
              selectable
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="assessments">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <DataTable data={jobCandidates.flatMap((c: any) => (c.assessments || []).map((a: any) => ({ ...a, candidateName: c.name })))} columns={assessmentColumns} searchPlaceholder="Search assessments..." />
          </motion.div>
        </TabsContent>
      </Tabs>

      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Job</SheetTitle>
            <SheetDescription>Update this job posting and save changes.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Job Title</Label>
              <Input id="edit-title" value={editJob.title} onChange={(e) => setEditJob({ ...editJob, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input id="edit-department" value={editJob.department} onChange={(e) => setEditJob({ ...editJob, department: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input id="edit-location" value={editJob.location} onChange={(e) => setEditJob({ ...editJob, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-level">Experience Level</Label>
              <Select value={editJob.experienceLevel || "MID"} onValueChange={(v) => setEditJob({ ...editJob, experienceLevel: v })}>
                <SelectTrigger id="edit-level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTRY">ENTRY</SelectItem>
                  <SelectItem value="MID">MID</SelectItem>
                  <SelectItem value="SENIOR">SENIOR</SelectItem>
                  <SelectItem value="LEAD">LEAD</SelectItem>
                  <SelectItem value="EXECUTIVE">EXECUTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-salary-min">Min Salary</Label>
                <Input id="edit-salary-min" type="number" value={editJob.salaryMin} onChange={(e) => setEditJob({ ...editJob, salaryMin: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-salary-max">Max Salary</Label>
                <Input id="edit-salary-max" type="number" value={editJob.salaryMax} onChange={(e) => setEditJob({ ...editJob, salaryMax: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" className="min-h-[120px]" value={editJob.description} onChange={(e) => setEditJob({ ...editJob, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-skills">Skills (comma-separated)</Label>
              <Input id="edit-skills" value={editJob.skills} onChange={(e) => setEditJob({ ...editJob, skills: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-requirements">Requirements (one per line)</Label>
              <Textarea id="edit-requirements" className="min-h-[110px]" value={editJob.requirements} onChange={(e) => setEditJob({ ...editJob, requirements: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditOpen(false)} disabled={isSavingEdit}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
