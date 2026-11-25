"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, MapPin, Users, Calendar, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { PageHeader } from "@/components/page-header"
import { StageBadge } from "@/components/stage-badge"
import { SkillBadge } from "@/components/skill-badge"
import { jobsApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const departments = ["Engineering", "Design", "Data", "Marketing", "Sales", "HR"]

export default function JobsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [filter, setFilter] = useState({ status: "all", department: "all" })
  const [search, setSearch] = useState("")
  const [jobsList, setJobsList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newJob, setNewJob] = useState({
    title: "", department: "", location: "", type: "full-time",
    experienceLevel: "", salaryMin: "", salaryMax: "",
    description: "", requirements: "", skills: "",
  })
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    setIsLoading(true)
    try {
      const res = await jobsApi.list()
      setJobsList(res.data)
    } catch {
      toast({ title: "Failed to load jobs", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredJobs = jobsList.filter((job) => {
    if (filter.status !== "all" && job.status !== filter.status) return false
    if (filter.department !== "all" && job.department?.toLowerCase() !== filter.department) return false
    if (search && !job.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleCreateJob = async () => {
    setIsCreating(true)
    try {
      await jobsApi.create({
        title: newJob.title,
        description: newJob.description,
        department: newJob.department,
        location: newJob.location,
        experienceLevel: newJob.experienceLevel || undefined,
        skills: newJob.skills.split(",").map((s) => s.trim()).filter(Boolean),
        requirements: newJob.requirements ? newJob.requirements.split("\n").map((s) => s.trim()).filter(Boolean) : undefined,
        salaryMin: newJob.salaryMin ? parseInt(newJob.salaryMin) : undefined,
        salaryMax: newJob.salaryMax ? parseInt(newJob.salaryMax) : undefined,
      })
      setIsSheetOpen(false)
      toast({ title: "Job created", description: "Your new job posting has been created successfully." })
      await loadJobs()
    } catch (err: any) {
      toast({ title: "Failed to create job", description: err.message, variant: "destructive" })
    } finally {
      setIsCreating(false)
    }
  }

  const handlePublish = async (id: string) => {
    try {
      await jobsApi.publish(id)
      toast({ title: "Job published" })
      await loadJobs()
    } catch {
      toast({ title: "Failed to publish", variant: "destructive" })
    }
  }

  const handleClose = async (id: string) => {
    try {
      await jobsApi.close(id)
      toast({ title: "Job closed" })
      await loadJobs()
    } catch {
      toast({ title: "Failed to close", variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-9 flex-1 max-w-sm" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Jobs"
        description="Manage your job postings"
        actions={
          <Button onClick={() => setIsSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter.status} onValueChange={(value) => setFilter({ ...filter, status: value })}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter.department} onValueChange={(value) => setFilter({ ...filter, department: value })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept.toLowerCase()}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Jobs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredJobs.map((job, index) => (
            <motion.div
              key={job.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link href={`/jobs/${job.id}`}>
                <Card className="group relative overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <motion.div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardContent className="p-6 relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {job.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{job.department}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.preventDefault(); router.push(`/jobs/${job.id}`) }}>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          {job.status === "DRAFT" && (
                            <DropdownMenuItem onClick={(e) => { e.preventDefault(); handlePublish(job.id) }}>
                              <Plus className="mr-2 h-4 w-4" /> Publish
                            </DropdownMenuItem>
                          )}
                          {job.status === "ACTIVE" && (
                            <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleClose(job.id) }}>
                              <Trash2 className="mr-2 h-4 w-4" /> Close
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{job._count?.candidates ?? 0} candidates</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Created {new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {job.skills.slice(0, 3).map((skill: string) => (
                        <SkillBadge key={skill} skill={skill} />
                      ))}
                      {job.skills.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{job.skills.length - 3}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <StageBadge status={job.status} />
                      <span className="text-sm font-medium text-muted-foreground">{job.experienceLevel}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Job Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Job</SheetTitle>
            <SheetDescription>Fill in the details to create a new job posting</SheetDescription>
          </SheetHeader>
          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input id="title" placeholder="e.g., Senior Frontend Engineer" value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={newJob.department} onValueChange={(v) => setNewJob({ ...newJob, department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept.toLowerCase()}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="e.g., Remote, New York, NY" value={newJob.location} onChange={(e) => setNewJob({ ...newJob, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Experience Level</Label>
              <Select value={newJob.experienceLevel} onValueChange={(v) => setNewJob({ ...newJob, experienceLevel: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTRY">Entry / Intern</SelectItem>
                  <SelectItem value="MID">Mid-Level</SelectItem>
                  <SelectItem value="SENIOR">Senior</SelectItem>
                  <SelectItem value="LEAD">Lead</SelectItem>
                  <SelectItem value="EXECUTIVE">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Min Salary ($)</Label>
                <Input id="salaryMin" placeholder="e.g., 100000" value={newJob.salaryMin} onChange={(e) => setNewJob({ ...newJob, salaryMin: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">Max Salary ($)</Label>
                <Input id="salaryMax" placeholder="e.g., 150000" value={newJob.salaryMax} onChange={(e) => setNewJob({ ...newJob, salaryMax: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the role and responsibilities..."
                className="min-h-[120px]"
                value={newJob.description}
                onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills">Required Skills</Label>
              <Input id="skills" placeholder="e.g., React, TypeScript, Node.js" value={newJob.skills} onChange={(e) => setNewJob({ ...newJob, skills: e.target.value })} />
              <p className="text-xs text-muted-foreground">Separate skills with commas</p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsSheetOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateJob} disabled={isCreating || !newJob.title}>
                {isCreating ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
