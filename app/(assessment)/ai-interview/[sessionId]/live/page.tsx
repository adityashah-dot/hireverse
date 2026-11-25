"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Camera, CameraOff, Clock, AlertTriangle, CheckCircle, Loader2, ArrowRight, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface SessionData {
  sessionId: string
  candidateName: string
  candidateEmail: string
  interviewId: string
  position: string
  firstQuestion: string | null
  introduction: string
  totalQuestions: number
  timeLimitMinutes: number
  isResumed: boolean
}

type InterviewStatus = "intro" | "question" | "waiting" | "evaluating" | "followup" | "complete" | "expired"

export default function LiveInterviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const unwrappedParams = React.use(params)
  const router = useRouter()

  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [status, setStatus] = useState<InterviewStatus>("intro")
  const [currentQuestion, setCurrentQuestion] = useState<string>("")
  const [currentQuestionNum, setCurrentQuestionNum] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(8)
  const [feedback, setFeedback] = useState<string>("")
  const [score, setScore] = useState<number | null>(null)
  const [followupQuestion, setFollowupQuestion] = useState<string | null>(null)
  const [keyPointsCovered, setKeyPointsCovered] = useState<string[]>([])
  const [keyPointsMissed, setKeyPointsMissed] = useState<string[]>([])
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [finalStatus, setFinalStatus] = useState<string>("")
  const [timeLeft, setTimeLeft] = useState(30 * 60)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [evaluation, setEvaluation] = useState<any>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const eyeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem("ai_interview_session")
    if (!stored) {
      router.push(`/ai-interview/${unwrappedParams.sessionId}`)
      return
    }
    const data: SessionData = JSON.parse(stored)
    setSessionData(data)
    setTotalQuestions(data.totalQuestions)
    setTimeLeft(data.timeLimitMinutes * 60)

    if (data.firstQuestion) {
      setCurrentQuestion(data.firstQuestion)
    }

    startCamera()
    startEyeTracking()

    return () => {
      stopCamera()
      if (eyeIntervalRef.current) clearInterval(eyeIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (status === "intro") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            clearInterval(timerRef.current!)
            setStatus("expired")
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setError("Camera access denied. Please enable camera permissions.")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  const startEyeTracking = () => {
    eyeIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !sessionData?.sessionId) return
      const canvas = document.createElement("canvas")
      canvas.width = 320
      canvas.height = 240
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.drawImage(videoRef.current, 0, 0, 320, 240)
      const frameData = canvas.toDataURL("image/jpeg", 0.6)
      try {
        await fetch("/api/ai-interview/eye-detection/frame", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionData.sessionId,
            frame_data: frameData,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch {}
    }, 3000)
  }

  const startRecording = async () => {
    if (!streamRef.current) return
    chunksRef.current = []
    const recorder = new MediaRecorder(streamRef.current, { mimeType: "audio/webm" })
    mediaRecorderRef.current = recorder
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" })
      setRecordedBlob(blob)
      await submitAnswer(blob)
    }
    recorder.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const submitAnswer = async (audioBlob: Blob) => {
    if (!sessionData) return
    setStatus("evaluating")
    try {
      const formData = new FormData()
      formData.append("file", audioBlob, "answer.webm")

      const transcribeRes = await fetch(
        `/api/ai-interview/interview/transcribe?session_id=${sessionData.sessionId}`,
        { method: "POST", body: formData }
      )

      if (!transcribeRes.ok) {
        const errText = await transcribeRes.text()
        throw new Error(`Transcription failed: ${errText}`)
      }

      const transcribeData = await transcribeRes.json()

      if (transcribeData.status === "silence_detected") {
        setFeedback("No audio detected. Please speak your answer clearly.")
        setStatus("waiting")
        return
      }

      const answerText = transcribeData.transcript

      const evalRes = await fetch("/api/ai-interview/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionData.sessionId,
          answer_text: answerText,
          question_id: currentQuestionNum,
        }),
      })

      if (!evalRes.ok) {
        if (evalRes.status === 410) {
          setStatus("expired")
          return
        }
        const errText = await evalRes.text()
        throw new Error(`Evaluation failed: ${errText}`)
      }

      const evalData = await evalRes.json()
      setEvaluation(evalData)

      if (evalData.status === "followup_required") {
        setFollowupQuestion(evalData.followup_question || evalData.alex_response)
        setFeedback(evalData.feedback || "Let me ask a follow-up question.")
        setScore(evalData.score)
        setStatus("followup")
      } else if (evalData.status === "interview_complete") {
        setFinalScore(evalData.final_score || evalData.score)
        setFinalStatus("completed")
        setStatus("complete")
      } else {
        setFeedback(evalData.feedback || "")
        setScore(evalData.score)
        setKeyPointsCovered(evalData.key_points_covered || [])
        setKeyPointsMissed(evalData.key_points_missed || [])
        setStatus("waiting")

        if (evalData.next_question) {
          setCurrentQuestion(evalData.next_question)
          setCurrentQuestionNum(evalData.question_number)
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to process answer")
      setStatus("waiting")
    }
  }

  const handleStartInterview = () => {
    setStatus("question")
  }

  const handleNextQuestion = () => {
    setFeedback("")
    setScore(null)
    setKeyPointsCovered([])
    setKeyPointsMissed([])
    setRecordedBlob(null)
    setStatus("question")
  }

  const handleAnswerFollowup = () => {
    setFollowupQuestion(null)
    setStatus("question")
  }

  const handleEndInterview = async () => {
    if (!sessionData) return
    try {
      await fetch("/api/ai-interview/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionData.sessionId }),
      })
    } catch {}
    setStatus("complete")
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">H</div>
          <span className="font-semibold text-sm">HireVerse AI Interview</span>
        </div>
        <div className="flex items-center gap-4">
          <Badge className={`${timeLeft < 120 ? "bg-red-600" : timeLeft < 300 ? "bg-amber-600" : "bg-gray-700"} text-white`}>
            <Clock className="h-3.5 w-3.5 mr-1" />
            {formatTime(timeLeft)}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Q {currentQuestionNum} of {totalQuestions}</span>
          </div>
          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={handleEndInterview}>
            End Interview
          </Button>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-3 gap-0">
        {/* Webcam + recording area */}
        <div className="lg:col-span-2 relative bg-gray-900 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl aspect-video bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 flex gap-2">
              <Badge className={cameraOn ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
                {cameraOn ? <Camera className="h-3 w-3 mr-1" /> : <CameraOff className="h-3 w-3 mr-1" />}
                {cameraOn ? "Camera On" : "Camera Off"}
              </Badge>
              <Badge className={isRecording ? "bg-red-600 animate-pulse text-white" : "bg-gray-600 text-white"}>
                {isRecording ? <Mic className="h-3 w-3 mr-1" /> : <MicOff className="h-3 w-3 mr-1" />}
                {isRecording ? "Recording" : "Mic Ready"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Question & interaction panel */}
        <div className="bg-gray-900 border-l border-gray-800 flex flex-col">
          <AnimatePresence mode="wait">
            {status === "intro" && (
              <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col p-6">
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-indigo-600/30 flex items-center justify-center">
                    <Mic className="h-8 w-8 text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-semibold">Welcome{sessionData?.isResumed ? " Back" : ""}, {sessionData?.candidateName}</h2>
                  <p className="text-gray-400 text-sm max-w-sm">{sessionData?.introduction}</p>
                  <p className="text-gray-500 text-xs">Position: {sessionData?.position}</p>
                  <div className="flex gap-3 mt-4">
                    <div className="text-center px-3 py-2 rounded-lg bg-gray-800">
                      <p className="text-lg font-bold text-indigo-400">{totalQuestions}</p>
                      <p className="text-xs text-gray-500">Questions</p>
                    </div>
                    <div className="text-center px-3 py-2 rounded-lg bg-gray-800">
                      <p className="text-lg font-bold text-amber-400">{sessionData?.timeLimitMinutes}</p>
                      <p className="text-xs text-gray-500">Minutes</p>
                    </div>
                  </div>
                </div>
                <Button onClick={handleStartInterview} size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700">
                  {sessionData?.isResumed ? "Continue" : "Start Interview"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {status === "question" && (
              <motion.div key={`q-${currentQuestionNum}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col p-6">
                <div className="mb-2">
                  <p className="text-xs text-gray-500">
                    Question {currentQuestionNum} of {totalQuestions}
                    {followupQuestion ? " · Follow-up" : ""}
                  </p>
                  <Progress value={(currentQuestionNum / totalQuestions) * 100} className="h-1 mt-1" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-6">
                      <p className="text-base leading-relaxed text-gray-200">
                        {followupQuestion || currentQuestion}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <div className="mt-4 space-y-3">
                  {isRecording ? (
                    <Button onClick={stopRecording} size="lg" className="w-full bg-red-600 hover:bg-red-700 animate-pulse">
                      <Mic className="mr-2 h-5 w-5" /> Stop Recording & Submit
                    </Button>
                  ) : (
                    <Button onClick={startRecording} size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700">
                      <Mic className="mr-2 h-5 w-5" /> Start Recording Answer
                    </Button>
                  )}
                  <p className="text-xs text-gray-500 text-center">
                    {isRecording ? "Speaking... click to submit your answer" : "Click to record your answer. Speak clearly."}
                  </p>
                </div>
              </motion.div>
            )}

            {status === "evaluating" && (
              <motion.div key="evaluating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-6">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mb-4" />
                <p className="text-gray-400 text-sm">Evaluating your answer...</p>
              </motion.div>
            )}

            {status === "waiting" && (
              <motion.div key="waiting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col p-6 overflow-y-auto">
                <div className="mb-3">
                  <p className="text-xs text-gray-500">Question {currentQuestionNum} of {totalQuestions} · Answer evaluated</p>
                </div>

                {score != null && (
                  <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-gray-800">
                    <div className={`text-3xl font-bold ${score >= 70 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                      {score}/100
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200">Score</p>
                      <p className="text-xs text-gray-400">{score >= 70 ? "Great answer" : score >= 50 ? "Good effort" : "Needs improvement"}</p>
                    </div>
                  </div>
                )}

                {feedback && (
                  <Card className="bg-gray-800 border-gray-700 mb-4">
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-300">{feedback}</p>
                    </CardContent>
                  </Card>
                )}

                {keyPointsCovered.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-emerald-400 font-medium mb-1">✓ Points covered:</p>
                    <ul className="space-y-0.5">
                      {keyPointsCovered.map((p, i) => (
                        <li key={i} className="text-xs text-gray-400 flex items-start gap-1">
                          <CheckCircle className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {keyPointsMissed.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-amber-400 font-medium mb-1">✗ Points missed:</p>
                    <ul className="space-y-0.5">
                      {keyPointsMissed.map((p, i) => (
                        <li key={i} className="text-xs text-gray-400 flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button onClick={handleNextQuestion} className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2">
                  Next Question <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {status === "followup" && (
              <motion.div key="followup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col p-6 overflow-y-auto">
                <Badge className="bg-amber-600 text-white self-start mb-3">Follow-up Question</Badge>
                {feedback && (
                  <Card className="bg-gray-800 border-gray-700 mb-4">
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-300">{feedback}</p>
                    </CardContent>
                  </Card>
                )}
                <Card className="bg-gray-800 border-amber-700/50 mb-4">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-200">{followupQuestion}</p>
                  </CardContent>
                </Card>
                <div className="space-y-3">
                  {isRecording ? (
                    <Button onClick={stopRecording} size="lg" className="w-full bg-red-600 hover:bg-red-700 animate-pulse">
                      <Mic className="mr-2 h-5 w-5" /> Stop Recording
                    </Button>
                  ) : (
                    <Button onClick={startRecording} size="lg" className="w-full bg-amber-600 hover:bg-amber-700">
                      <Mic className="mr-2 h-5 w-5" /> Answer Follow-up
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="w-full text-gray-400" onClick={handleAnswerFollowup}>
                    Skip Follow-up
                  </Button>
                </div>
              </motion.div>
            )}

            {status === "complete" && (
              <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-600/30 flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Interview Complete!</h2>
                {finalScore != null && (
                  <p className={`text-3xl font-bold mb-1 ${finalScore >= 70 ? "text-emerald-400" : finalScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                    {finalScore.toFixed(1)}/100
                  </p>
                )}
                <p className="text-gray-400 text-sm mb-6">
                  Thank you for completing the interview. Your results have been submitted.
                </p>
                <Button onClick={() => router.push("/")} className="bg-indigo-600 hover:bg-indigo-700">
                  Return to Home
                </Button>
              </motion.div>
            )}

            {status === "expired" && (
              <motion.div key="expired" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-red-600/30 flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 text-red-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Time&apos;s Up</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Your interview session has expired. Any answers you submitted have been saved.
                </p>
                <Button onClick={() => router.push("/")} className="bg-indigo-600 hover:bg-indigo-700">
                  Return to Home
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
