"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useParams, useRouter } from "next/navigation"
import { ClipboardCheck, ChevronLeft, ChevronRight, Flag, Clock, AlertCircle, CheckCircle, Loader2, Video, VideoOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { assessmentsApi } from "@/lib/api"

interface Question {
  id: string
  text: string
  options: string[]
  category: string
  difficulty: string
}

interface AssessmentData {
  id: string
  sessionToken: string
  jobTitle: string
  companyName: string
  candidateName: string
  duration: number
  questionCount: number
  status: string
  questions: Question[]
  startedAt?: string
}

type AnswerStatus = "unanswered" | "answered" | "marked"

export default function AssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const sessionToken = params.sessionId as string

  const [assessment, setAssessment] = useState<AssessmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [questionTimings, setQuestionTimings] = useState<Record<number, number>>({})
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const [markedQuestions, setMarkedQuestions] = useState<Set<number>>(new Set())
  const [timeLeft, setTimeLeft] = useState(0)
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitResult, setSubmitResult] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const tabSwitchCount = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const webcamRef = useRef<HTMLVideoElement | null>(null)
  const webcamStreamRef = useRef<MediaStream | null>(null)
  const snapshotIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [webcamEnabled, setWebcamEnabled] = useState(false)
  const [webcamError, setWebcamError] = useState<string | null>(null)

  // Fetch assessment data
  useEffect(() => {
    const load = async () => {
      try {
        const res = await assessmentsApi.getByToken(sessionToken)
        setAssessment(res.data)
        setTimeLeft((res.data.duration || 60) * 60)
      } catch (err: any) {
        setError(err.message || "Assessment not found")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionToken])

  // Tab-switch detection
  useEffect(() => {
    if (!started || isSubmitted) return
    const handleVisibility = () => {
      if (document.hidden) {
        tabSwitchCount.current += 1
        assessmentsApi.logEvent(sessionToken, "tab_switch", tabSwitchCount.current).catch(() => {})
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [started, isSubmitted, sessionToken])

  // Right-click / copy prevention
  useEffect(() => {
    if (!started || isSubmitted) return
    const prevent = (e: Event) => e.preventDefault()
    document.addEventListener("contextmenu", prevent)
    document.addEventListener("copy", prevent)
    return () => {
      document.removeEventListener("contextmenu", prevent)
      document.removeEventListener("copy", prevent)
    }
  }, [started, isSubmitted])

  // Timer countdown
  useEffect(() => {
    if (!started || isSubmitted || timeLeft <= 0) return
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [started, isSubmitted])

  const handleAutoSubmit = useCallback(async () => {
    if (isSubmitted) return
    setIsSubmitDialogOpen(false)
    await submitAssessment()
  }, [isSubmitted])

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      webcamStreamRef.current = stream
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream
        await webcamRef.current.play()
      }
      setWebcamEnabled(true)
      setWebcamError(null)
    } catch (err: any) {
      setWebcamError(err.message || 'Camera access denied')
      setWebcamEnabled(false)
    }
  }, [])

  const stopWebcam = useCallback(() => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((t) => t.stop())
      webcamStreamRef.current = null
    }
    if (snapshotIntervalRef.current) {
      clearInterval(snapshotIntervalRef.current)
      snapshotIntervalRef.current = null
    }
    setWebcamEnabled(false)
  }, [])

  const captureSnapshot = useCallback(async () => {
    if (!webcamRef.current || !webcamEnabled) return
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(webcamRef.current, 0, 0, 320, 240)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.6))
    if (!blob) return
    try {
      const formData = new FormData()
      formData.append('frame', blob, 'snapshot.jpg')
      formData.append('sessionToken', sessionToken)
      await fetch('/api/assessments/' + sessionToken + '/event', {
        method: 'POST',
        body: JSON.stringify({ type: 'webcam_snapshot', timestamp: Date.now() }),
        headers: { 'Content-Type': 'application/json' },
      })
    } catch { /* non-critical */ }
  }, [webcamEnabled, sessionToken])

  // Start webcam snapshots when assessment starts
  useEffect(() => {
    if (!started || !webcamEnabled || isSubmitted) return
    captureSnapshot() // Initial snapshot
    snapshotIntervalRef.current = setInterval(captureSnapshot, 30_000) // Every 30s
    return () => {
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current)
    }
  }, [started, webcamEnabled, isSubmitted, captureSnapshot])

  const handleStart = async () => {
    try {
      await assessmentsApi.start(sessionToken)
      setStarted(true)
      setQuestionStartTime(Date.now())
    } catch (err: any) {
      setError(err.message)
    }
  }

  const submitAssessment = async () => {
    if (!assessment) return
    setIsSubmitting(true)
    stopWebcam()
    const answersPayload = assessment.questions.map((q, idx) => ({
      questionId: q.id,
      selectedAnswer: answers[idx] ?? -1,
      timeTaken: questionTimings[idx] ?? 0,
    }))
    try {
      const result = await assessmentsApi.submit(sessionToken, answersPayload, tabSwitchCount.current)
      setSubmitResult(result)
      setIsSubmitted(true)
    } catch (err: any) {
      setError("Failed to submit. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const timerProgress = assessment ? (timeLeft / (assessment.duration * 60)) * 100 : 100

  const handleSelectAnswer = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: optionIndex }))
  }

  const handleNavigate = (newIndex: number) => {
    const elapsed = Math.round((Date.now() - questionStartTime) / 1000)
    setQuestionTimings((prev) => ({ ...prev, [currentQuestion]: (prev[currentQuestion] || 0) + elapsed }))
    setQuestionStartTime(Date.now())
    setCurrentQuestion(newIndex)
  }

  const handleMarkForReview = () => {
    setMarkedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(currentQuestion)) newSet.delete(currentQuestion)
      else newSet.add(currentQuestion)
      return newSet
    })
  }

  const getQuestionStatus = (index: number): AnswerStatus => {
    if (markedQuestions.has(index)) return "marked"
    if (answers[index] !== undefined) return "answered"
    return "unanswered"
  }

  const handleSubmit = async () => {
    setIsSubmitDialogOpen(false)
    await submitAssessment()
  }

  const answeredCount = Object.keys(answers).length
  const markedCount = markedQuestions.size
  const questions = assessment?.questions || []

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !assessment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Assessment Unavailable</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  // Pre-start screen
  if (!started && assessment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <div className="text-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mx-auto mb-4">
              <ClipboardCheck className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{assessment.jobTitle}</h1>
            <p className="text-muted-foreground mt-1">{assessment.companyName}</p>
          </div>
          <div className="bg-muted/50 rounded-2xl p-6 space-y-4 mb-6">
            <h2 className="font-semibold text-foreground">Assessment Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Questions</p>
                <p className="text-2xl font-bold text-foreground">{assessment.questionCount}</p>
              </div>
              <div className="bg-background rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Time Limit</p>
                <p className="text-2xl font-bold text-foreground">{assessment.duration} min</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /> Do not switch tabs or copy content during the test</p>
              <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /> Ensure a stable internet connection before starting</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /> Timer starts immediately when you click Start</p>
            </div>

            {/* Webcam proctoring setup */}
            <div className="bg-background rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {webcamEnabled ? <Video className="h-4 w-4 text-emerald-500" /> : <VideoOff className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm font-medium">Camera Proctoring</span>
                </div>
                {!webcamEnabled && !webcamError && (
                  <Button size="sm" variant="outline" onClick={startWebcam}>
                    Enable Camera
                  </Button>
                )}
              </div>
              {webcamError && (
                <p className="text-xs text-red-500">{webcamError}</p>
              )}
              {webcamEnabled && (
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-w-xs mx-auto">
                  <video ref={webcamRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                </div>
              )}
              {!webcamEnabled && !webcamError && (
                <p className="text-xs text-muted-foreground">
                  Camera access is required for proctoring. Your privacy is protected — snapshots are only used to verify identity.
                </p>
              )}
            </div>
          </div>
          <Button className="w-full h-12 text-base" onClick={handleStart}>
            Start Assessment
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    )
  }

  // Submitted screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-6"
          >
            <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Assessment Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Your responses have been recorded. You will receive your results via email shortly.
          </p>
          <div className="bg-muted rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-sm text-muted-foreground">Questions Answered</p>
                <p className="text-2xl font-semibold">{answeredCount}/{questions.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-2xl font-semibold">
                  {submitResult?.score != null ? `${submitResult.score}%` : "Pending"}
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => router.push("/")} className="w-full">
            Close
          </Button>
        </motion.div>
      </div>
    )
  }

  const question = questions[currentQuestion]
  if (!question) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">{assessment?.jobTitle ?? "Assessment"}</h1>
            <p className="text-xs text-muted-foreground">{assessment?.companyName}</p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full",
              timeLeft < 300 ? "bg-red-100 dark:bg-red-900/30" : "bg-muted",
            )}
          >
            <Clock
              className={cn("h-4 w-4", timeLeft < 300 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}
            />
            <span
              className={cn(
                "font-mono font-semibold",
                timeLeft < 300 ? "text-red-600 dark:text-red-400" : "text-foreground",
              )}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="w-32">
            <Progress value={timerProgress} className="h-2" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Question area */}
        <div className="flex-1 flex flex-col p-6 lg:p-8">
          {/* Question header */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <Button
              variant={markedQuestions.has(currentQuestion) ? "default" : "outline"}
              size="sm"
              onClick={handleMarkForReview}
            >
              <Flag className="mr-2 h-4 w-4" />
              {markedQuestions.has(currentQuestion) ? "Marked" : "Mark for Review"}
            </Button>
          </div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <h2 className="text-xl font-medium text-foreground mb-8 leading-relaxed">{question.text}</h2>

              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleSelectAnswer(index)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                      answers[currentQuestion] === index
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                          answers[currentQuestion] === index
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30 text-muted-foreground",
                        )}
                      >
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-foreground">{option}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={() => handleNavigate(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            {currentQuestion === questions.length - 1 ? (
              <Button onClick={() => setIsSubmitDialogOpen(true)} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Assessment
              </Button>
            ) : (
              <Button onClick={() => handleNavigate(Math.min(questions.length - 1, currentQuestion + 1))}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Question navigator sidebar */}
        <aside className="hidden lg:block w-80 border-l border-border p-6 bg-muted/30">
          <h3 className="font-medium text-foreground mb-4">Question Navigator</h3>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center p-3 rounded-xl bg-background border border-border">
              <p className="text-lg font-semibold text-emerald-600">{answeredCount}</p>
              <p className="text-xs text-muted-foreground">Answered</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-background border border-border">
              <p className="text-lg font-semibold text-amber-600">{markedCount}</p>
              <p className="text-xs text-muted-foreground">Marked</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-background border border-border">
              <p className="text-lg font-semibold text-muted-foreground">{questions.length - answeredCount}</p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
          </div>

          {/* Question grid */}
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, index) => {
              const status = getQuestionStatus(index)
              return (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNavigate(index)}
                  className={cn(
                    "h-10 w-10 rounded-lg text-sm font-medium transition-colors",
                    currentQuestion === index && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    status === "answered" && "bg-emerald-500 text-white",
                    status === "marked" && "bg-amber-500 text-white",
                    status === "unanswered" && "bg-muted text-muted-foreground hover:bg-muted-foreground/20",
                  )}
                >
                  {index + 1}
                </motion.button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-4 w-4 rounded bg-emerald-500" />
              <span className="text-muted-foreground">Answered</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-4 w-4 rounded bg-amber-500" />
              <span className="text-muted-foreground">Marked for review</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-4 w-4 rounded bg-muted" />
              <span className="text-muted-foreground">Not answered</span>
            </div>
          </div>

          {/* Webcam indicator */}
          {webcamEnabled && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Camera Active</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Periodic snapshots are being taken for proctoring</p>
            </div>
          )}

          {/* Submit button */}
          <Button className="w-full mt-6" onClick={() => setIsSubmitDialogOpen(true)}>
            Submit Assessment
          </Button>
        </aside>
      </div>

      {/* Submit confirmation dialog */}
      <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to submit your assessment?</p>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted mt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>{answeredCount} answered</span>
                </div>
                {markedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-amber-600" />
                    <span>{markedCount} marked</span>
                  </div>
                )}
                {questions.length - answeredCount > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>{questions.length - answeredCount} unanswered</span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Test</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
