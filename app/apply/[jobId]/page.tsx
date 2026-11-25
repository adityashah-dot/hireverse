"use client"

import type React from "react"

import { useState, use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Clock, DollarSign, ArrowLeft, Upload, CheckCircle2, Sparkles, FileText, Send, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { publicApi } from "@/lib/api"

export default function ApplyPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params)
  const router = useRouter()
  const [job, setJob] = useState<any>(null)
  const [jobLoading, setJobLoading] = useState(true)
  const [jobError, setJobError] = useState<string | null>(null)

  useEffect(() => {
    publicApi.getJob(jobId)
      .then((res) => setJob(res.data))
      .catch(() => setJobError("Job not found or no longer available"))
      .finally(() => setJobLoading(false))
  }, [jobId])

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    linkedIn: "",
    portfolio: "",
    coverLetter: "",
  })
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const displayCurrency =
    !job?.salaryCurrency || job.salaryCurrency.toUpperCase() === "USD"
      ? "INR"
      : job.salaryCurrency.toUpperCase()

  if (jobLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (jobError || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Job not found</h1>
          <p className="text-muted-foreground mb-4">{jobError}</p>
          <Button asChild>
            <Link href="/careers">View all positions</Link>
          </Button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resumeFile) { setSubmitError("Please upload your resume"); return }
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const fd = new FormData()
      fd.append("jobId", job.id)
      fd.append("name", formData.name)
      fd.append("email", formData.email)
      fd.append("phone", formData.phone)
      fd.append("linkedIn", formData.linkedIn)
      fd.append("portfolio", formData.portfolio)
      fd.append("coverLetter", formData.coverLetter)
      fd.append("resume", resumeFile)
      const res = await publicApi.apply(fd)
      if (res.error) throw new Error(res.error)
      setIsSubmitted(true)
    } catch (err: any) {
      setSubmitError(err.message || "Submission failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setResumeFile(file)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">HireVerse</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {isSubmitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6"
          >
            <div className="text-center max-w-md">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </motion.div>
              <h1 className="text-3xl font-bold text-foreground mb-3">Application Submitted!</h1>
              <p className="text-muted-foreground mb-8">
                Thank you for applying for the {job.title} position. We've received your application and will review it
                shortly.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link href="/careers">View More Positions</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">Back to Home</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="max-w-4xl mx-auto px-6 py-8">
              <Button variant="ghost" className="mb-6 -ml-2" asChild>
                <Link href="/careers">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to all positions
                </Link>
              </Button>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Job Details Sidebar */}
                <div className="lg:col-span-1">
                  <Card className="p-6 sticky top-24">
                    <div className="mb-4">
                      <Badge variant="secondary" className="mb-3">
                        {job.department}
                      </Badge>
                      <h1 className="text-xl font-bold text-foreground mb-2">{job.title}</h1>
                    </div>

                    <div className="space-y-3 text-sm mb-6">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{job.experienceLevel}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        <span>{job.salaryMin && job.salaryMax ? `${displayCurrency} ${(job.salaryMin / 1000).toFixed(0)}k - ${(job.salaryMax / 1000).toFixed(0)}k` : job.salaryMin ? `From ${displayCurrency} ${(job.salaryMin / 1000).toFixed(0)}k` : "Competitive"}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-foreground mb-2">Required Skills</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.map((skill: string) => (
                          <Badge key={skill} variant="outline" className="text-xs font-normal">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Application Form */}
                <div className="lg:col-span-2">
                  <Card className="p-6 md:p-8">
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Apply for this position</h2>
                      <p className="text-muted-foreground">
                        Fill out the form below to submit your application. All fields marked with * are required.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            placeholder="+1 (555) 123-4567"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="linkedIn">LinkedIn Profile</Label>
                          <Input
                            id="linkedIn"
                            placeholder="linkedin.com/in/johndoe"
                            value={formData.linkedIn}
                            onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="portfolio">Portfolio / Website</Label>
                        <Input
                          id="portfolio"
                          placeholder="https://johndoe.com"
                          value={formData.portfolio}
                          onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="resume">Resume / CV *</Label>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                          <input
                            id="resume"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            required
                          />
                          {resumeFile ? (
                            <div className="flex items-center justify-center gap-2 text-primary">
                              <FileText className="w-5 h-5" />
                              <span className="font-medium">{resumeFile.name}</span>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, or DOCX (max 5MB)</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="coverLetter">Cover Letter</Label>
                        <Textarea
                          id="coverLetter"
                          placeholder="Tell us why you're interested in this role and what makes you a great fit..."
                          rows={5}
                          value={formData.coverLetter}
                          onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                        />
                      </div>

                      {submitError && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {submitError}
                        </div>
                      )}

                      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                          />
                        ) : (
                          <>
                            Submit Application
                            <Send className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </form>
                  </Card>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
