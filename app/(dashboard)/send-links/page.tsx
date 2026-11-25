"use client"

import { useState, useEffect, Suspense } from "react"
import { motion } from "framer-motion"
import { useSearchParams } from "next/navigation"
import { Send, FileText, Video, Link2, Clock, Copy, CheckCircle2, Mail, Plus, Trash2, BookOpen, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/page-header"
import { candidatesApi, assessmentsApi, interviewsApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// MCQ Question Template
interface MCQQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
}

// Pre-built assessment templates with AI focus topics
const assessmentTemplates = [
  { id: "frontend", name: "Frontend Developer", questions: 25, duration: 60, focusTopics: ["React", "TypeScript", "CSS", "HTML", "JavaScript", "Web Performance", "Accessibility"] },
  { id: "backend", name: "Backend Developer", questions: 30, duration: 75, focusTopics: ["Node.js", "REST APIs", "Databases", "SQL", "Authentication", "System Design", "Docker"] },
  { id: "fullstack", name: "Full Stack Developer", questions: 35, duration: 90, focusTopics: ["React", "Node.js", "TypeScript", "Databases", "REST APIs", "DevOps", "System Design"] },
  { id: "design", name: "Product Designer", questions: 20, duration: 45, focusTopics: ["UI/UX Design", "Figma", "Design Systems", "User Research", "Prototyping", "Accessibility"] },
  { id: "data", name: "Data Scientist", questions: 30, duration: 90, focusTopics: ["Python", "Machine Learning", "Statistics", "SQL", "Data Visualization", "Deep Learning"] },
]

// Interview types — IDs must match the API enum exactly
const interviewTypes = [
  { id: "TECHNICAL", name: "Technical Interview", icon: FileText, duration: "60 min" },
  { id: "BEHAVIORAL", name: "Behavioral Interview", icon: Video, duration: "45 min" },
  { id: "VIDEO", name: "System Design", icon: BookOpen, duration: "60 min" },
  { id: "FINAL", name: "Culture Fit", icon: Video, duration: "30 min" },
]

function SendLinksContent() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState(searchParams.get("type") || "assessment")
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>(
    searchParams.get("candidateId") ? [searchParams.get("candidateId")!] : [],
  )
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    candidatesApi.list().then((res) => setCandidates(res.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    // Prevent carrying assessment link UI state when switching tabs.
    setGeneratedLink(null)
  }, [activeTab])

  // Assessment state
  const [assessmentConfig, setAssessmentConfig] = useState({
    template: "",
    customName: "",
    questionCount: 20,
    duration: 60,
    deadline: "",
    sendReminder: true,
    proctoring: false,
    useCandidateContext: true,
  })

  // Interview state
  const [interviewConfig, setInterviewConfig] = useState({
    type: "",
    date: "",
    time: "",
    duration: "60",
    interviewers: [] as string[],
    customMessage: "",
    sendCalendarInvite: true,
  })

  // Custom MCQ state
  const [customQuestions, setCustomQuestions] = useState<MCQQuestion[]>([
    { id: "1", question: "", options: ["", "", "", ""], correctAnswer: 0 },
  ])

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    setCopiedLink(link)
    setTimeout(() => setCopiedLink(null), 2000)
    toast({
      title: "Link copied",
      description: "The link has been copied to your clipboard",
    })
  }

  const handleGenerateLink = async () => {
    const candidateId = selectedCandidates[0]
    if (!candidateId) {
      toast({ title: "Select a candidate first", description: "Choose at least one candidate to generate a link", variant: "destructive" })
      return
    }
    setIsGenerating(true)
    try {
      if (activeTab === "interview") {
        toast({
          title: "AI interview flow",
          description: "No external meeting link is needed. Candidate gets HireVerse AI interview link when you send invite.",
        })
        return
      }

      const candidate = candidates.find((c: any) => c.id === candidateId)
      const template = assessmentTemplates.find((t) => t.id === assessmentConfig.template)
      const focusTopics = template?.focusTopics || candidate?.job?.skills || []
      const res: any = await assessmentsApi.send({
        candidateId,
        questionCount: template?.questions || assessmentConfig.questionCount,
        duration: template?.duration || assessmentConfig.duration,
        expiresInHours: 48,
        customMessage: "You have been invited to take a technical assessment.",
        useCandidateContext: assessmentConfig.useCandidateContext,
        focusTopics: focusTopics.length > 0 ? focusTopics : undefined,
      })
      const link = res?.assessmentUrl || (res?.sessionToken ? `${window.location.origin}/assessment/${res.sessionToken}` : null)
      if (link) {
        setGeneratedLink(link)
        toast({ title: "Link generated", description: "Your unique assessment link is ready to share" })
      } else {
        throw new Error("No assessment URL returned")
      }
    } catch (err: any) {
      toast({ title: "Failed to generate link", description: err.message, variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendLinks = async () => {
    if (selectedCandidates.length === 0) {
      toast({ title: "No candidates selected", description: "Please select at least one candidate", variant: "destructive" })
      return
    }
    setIsSending(true)
    try {
      if (activeTab === "assessment") {
        await Promise.all(
          selectedCandidates.map((candidateId) => {
            const candidate = candidates.find((c: any) => c.id === candidateId)
            const template = assessmentTemplates.find((t) => t.id === assessmentConfig.template)
            const focusTopics = template?.focusTopics || candidate?.job?.skills || []
            return assessmentsApi.send({
              candidateId,
              questionCount: template?.questions || assessmentConfig.questionCount,
              duration: template?.duration || assessmentConfig.duration,
              expiresInHours: 48,
              customMessage: `You have been invited to take a technical assessment.`,
              useCandidateContext: assessmentConfig.useCandidateContext,
              focusTopics: focusTopics.length > 0 ? focusTopics : undefined,
            })
          })
        )
      } else {
        await Promise.all(
          selectedCandidates.map((candidateId) => {
            const candidate = candidates.find((c: any) => c.id === candidateId)
            const interviewType = interviewConfig.type || "TECHNICAL"
            return interviewsApi.create({
              candidateId,
              jobId: candidate?.jobId || candidate?.job?.id || "",
              title: `${interviewType.charAt(0) + interviewType.slice(1).toLowerCase()} Interview - ${candidate?.name || "Candidate"}`,
              type: interviewType,
              scheduledAt: interviewConfig.date && interviewConfig.time
                ? new Date(`${interviewConfig.date}T${interviewConfig.time}`).toISOString()
                : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              duration: parseInt(interviewConfig.duration),
              location: "HireVerse AI Interview",
              interviewerIds: interviewConfig.interviewers,
              notes: interviewConfig.customMessage,
            })
          })
        )
      }
      toast({
        title: `${activeTab === "assessment" ? "Assessment" : "Interview"} invitations sent`,
        description: `Sent to ${selectedCandidates.length} candidate(s)`,
      })
      setSelectedCandidates([])
      setGeneratedLink(null)
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  const addQuestion = () => {
    setCustomQuestions([
      ...customQuestions,
      { id: String(customQuestions.length + 1), question: "", options: ["", "", "", ""], correctAnswer: 0 },
    ])
  }

  const removeQuestion = (id: string) => {
    setCustomQuestions(customQuestions.filter((q) => q.id !== id))
  }

  const updateQuestion = (id: string, field: keyof MCQQuestion, value: string | number | string[]) => {
    setCustomQuestions(customQuestions.map((q) => (q.id === id ? { ...q, [field]: value } : q)))
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Send Links" description="Send assessment tests and interview invitations to candidates" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="assessment" className="gap-2">
            <FileText className="h-4 w-4" />
            MCQ Assessment
          </TabsTrigger>
          <TabsTrigger value="interview" className="gap-2">
            <Video className="h-4 w-4" />
            Interview
          </TabsTrigger>
        </TabsList>

        {/* Assessment Tab */}
        <TabsContent value="assessment" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Configuration */}
            <div className="lg:col-span-2 space-y-6">
              {/* Template Selection */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Assessment Template
                  </CardTitle>
                  <CardDescription>AI dynamically generates unique questions based on the selected template and candidate profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {assessmentTemplates.map((template) => (
                      <motion.div key={template.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Card
                          className={cn(
                            "cursor-pointer transition-all border-2",
                            assessmentConfig.template === template.id
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:border-primary/30",
                          )}
                          onClick={() => setAssessmentConfig({ ...assessmentConfig, template: template.id })}
                        >
                          <CardContent className="p-4">
                            <p className="font-medium text-sm">{template.name}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{template.questions} questions</span>
                              <span>•</span>
                              <span>{template.duration} min</span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Card
                        className={cn(
                          "cursor-pointer transition-all border-2 border-dashed",
                          assessmentConfig.template === "custom"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30",
                        )}
                        onClick={() => setAssessmentConfig({ ...assessmentConfig, template: "custom" })}
                      >
                        <CardContent className="p-4 flex items-center justify-center h-full">
                          <div className="text-center">
                            <Plus className="h-6 w-6 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mt-1">Custom Test</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>

                  {/* Custom Questions Builder */}
                  {assessmentConfig.template === "custom" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4 pt-4 border-t"
                    >
                      <div className="flex items-center justify-between">
                        <Label>Custom Questions</Label>
                        <Button variant="outline" size="sm" onClick={addQuestion}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Question
                        </Button>
                      </div>
                      {customQuestions.map((q, index) => (
                        <Card key={q.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <Label>Question {index + 1}</Label>
                            {customQuestions.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => removeQuestion(q.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <Textarea
                            placeholder="Enter your question..."
                            value={q.question}
                            onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
                          />
                          <div className="grid gap-2">
                            {q.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={q.correctAnswer === optIndex}
                                  onChange={() => updateQuestion(q.id, "correctAnswer", optIndex)}
                                  className="accent-primary"
                                />
                                <Input
                                  placeholder={`Option ${optIndex + 1}`}
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...q.options]
                                    newOptions[optIndex] = e.target.value
                                    updateQuestion(q.id, "options", newOptions)
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* Settings */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Assessment Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={assessmentConfig.duration}
                        onChange={(e) =>
                          setAssessmentConfig({ ...assessmentConfig, duration: Number.parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Deadline</Label>
                      <Input
                        type="datetime-local"
                        value={assessmentConfig.deadline}
                        onChange={(e) => setAssessmentConfig({ ...assessmentConfig, deadline: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>AI-Personalized Questions</Label>
                      <p className="text-xs text-muted-foreground">Tailor questions to each candidate's skills &amp; gaps</p>
                    </div>
                    <Switch
                      checked={assessmentConfig.useCandidateContext}
                      onCheckedChange={(checked) => setAssessmentConfig({ ...assessmentConfig, useCandidateContext: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Send Reminder</Label>
                      <p className="text-xs text-muted-foreground">Send email reminder 24h before deadline</p>
                    </div>
                    <Switch
                      checked={assessmentConfig.sendReminder}
                      onCheckedChange={(checked) => setAssessmentConfig({ ...assessmentConfig, sendReminder: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Proctoring</Label>
                      <p className="text-xs text-muted-foreground">Monitor candidate during assessment</p>
                    </div>
                    <Switch
                      checked={assessmentConfig.proctoring}
                      onCheckedChange={(checked) => setAssessmentConfig({ ...assessmentConfig, proctoring: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Candidate Selection */}
            <div className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Select Candidates</CardTitle>
                  <CardDescription>Choose who to send the assessment to</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                  {candidates
                    .filter((c) => c.stage !== "rejected" && c.stage !== "hired")
                    .map((candidate) => (
                      <motion.div
                        key={candidate.id}
                        whileHover={{ scale: 1.01 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                          selectedCandidates.includes(candidate.id)
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted",
                        )}
                        onClick={() => {
                          setSelectedCandidates((prev) =>
                            prev.includes(candidate.id)
                              ? prev.filter((id) => id !== candidate.id)
                              : [...prev, candidate.id],
                          )
                        }}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {candidate.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{candidate.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{candidate.job?.title || ""}</p>
                        </div>
                        {selectedCandidates.includes(candidate.id) && (
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </motion.div>
                    ))}
                </CardContent>
              </Card>

              {/* Generated Link */}
              {generatedLink && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-primary" />
                        <Label>Generated Link</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input value={generatedLink} readOnly className="text-sm" />
                        <Button variant="outline" size="icon" onClick={() => handleCopyLink(generatedLink)}>
                          {copiedLink === generatedLink ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button className="w-full" onClick={handleGenerateLink} disabled={isGenerating}>
                  {isGenerating ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                    </motion.div>
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  {isGenerating ? "Generating..." : "Generate Link"}
                </Button>
                <Button
                  className="w-full"
                  variant="default"
                  onClick={handleSendLinks}
                  disabled={selectedCandidates.length === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send to {selectedCandidates.length} Candidate(s)
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Interview Tab */}
        <TabsContent value="interview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Interview Type */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Interview Type</CardTitle>
                  <CardDescription>Select the type of interview to schedule</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {interviewTypes.map((type) => (
                      <motion.div key={type.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Card
                          className={cn(
                            "cursor-pointer transition-all border-2",
                            interviewConfig.type === type.id
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:border-primary/30",
                          )}
                          onClick={() => setInterviewConfig({ ...interviewConfig, type: type.id })}
                        >
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                              <type.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{type.name}</p>
                              <p className="text-xs text-muted-foreground">{type.duration}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Schedule */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Schedule Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={interviewConfig.date}
                        onChange={(e) => setInterviewConfig({ ...interviewConfig, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={interviewConfig.time}
                        onChange={(e) => setInterviewConfig({ ...interviewConfig, time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Select
                        value={interviewConfig.duration}
                        onValueChange={(value) => setInterviewConfig({ ...interviewConfig, duration: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Message (optional)</Label>
                    <Textarea
                      placeholder="Add a personal message for the candidate..."
                      value={interviewConfig.customMessage}
                      onChange={(e) => setInterviewConfig({ ...interviewConfig, customMessage: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Send Calendar Invite</Label>
                      <p className="text-xs text-muted-foreground">Automatically add to calendars</p>
                    </div>
                    <Switch
                      checked={interviewConfig.sendCalendarInvite}
                      onCheckedChange={(checked) =>
                        setInterviewConfig({ ...interviewConfig, sendCalendarInvite: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Candidate Selection (same as assessment) */}
            <div className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Select Candidates</CardTitle>
                  <CardDescription>Choose who to invite</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                  {candidates
                    .filter((c) => c.stage !== "rejected" && c.stage !== "hired")
                    .map((candidate) => (
                      <motion.div
                        key={candidate.id}
                        whileHover={{ scale: 1.01 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                          selectedCandidates.includes(candidate.id)
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted",
                        )}
                        onClick={() => {
                          setSelectedCandidates((prev) =>
                            prev.includes(candidate.id)
                              ? prev.filter((id) => id !== candidate.id)
                              : [...prev, candidate.id],
                          )
                        }}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {candidate.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{candidate.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{candidate.job?.title || ""}</p>
                        </div>
                        {selectedCandidates.includes(candidate.id) && (
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </motion.div>
                    ))}
                </CardContent>
              </Card>

              {generatedLink && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-primary" />
                        <Label>Meeting Link</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input value={generatedLink} readOnly className="text-sm" />
                        <Button variant="outline" size="icon" onClick={() => handleCopyLink(generatedLink)}>
                          {copiedLink === generatedLink ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <div className="space-y-3">
                <Button className="w-full" variant="outline" onClick={handleGenerateLink}>
                  <Video className="h-4 w-4 mr-2" />
                  AI Link Is Auto-Generated
                </Button>
                <Button
                  className="w-full"
                  variant="default"
                  onClick={handleSendLinks}
                  disabled={selectedCandidates.length === 0}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invites to {selectedCandidates.length} Candidate(s)
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SendLinksPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <SendLinksContent />
    </Suspense>
  )
}
