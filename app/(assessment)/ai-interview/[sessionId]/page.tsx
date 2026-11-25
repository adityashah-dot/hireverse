'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Mic, Camera, AlertTriangle, Loader2 } from 'lucide-react'

interface AIInterviewMeta {
  interviewId: string
  candidateName: string
  candidateEmail: string
  position: string
  type: string
  scheduledAt: string
  duration: number
}

function getExpectedQuestionCount(durationMinutes: number): number {
  if (durationMinutes <= 30) return 5
  if (durationMinutes <= 45) return 6
  return 7
}

function formatInterviewType(type: string): string {
  if (type === 'VIDEO') return 'system design'
  if (type === 'FINAL') return 'culture fit'
  return type.toLowerCase().replace(/_/g, ' ')
}

export default function AIInterviewStartPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const unwrappedParams = React.use(params)
  const router = useRouter()
  const sessionId = unwrappedParams.sessionId

  const [meta, setMeta] = useState<AIInterviewMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [permissionsGranted, setPermissionsGranted] = useState(false)
  const [checkingPermissions, setCheckingPermissions] = useState(false)

  useEffect(() => {
    fetchInterviewMeta()
  }, [sessionId])

  const fetchInterviewMeta = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/interviews/${sessionId}/ai-meta`)
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}))
        if (res.status === 404) throw new Error('Interview session not found. Please check your link.')
        if (res.status === 403) {
          throw new Error(
            errorBody?.error ||
            'Interview link is only available 10 minutes before and 10 minutes after the scheduled time.'
          )
        }
        if (res.status === 410) throw new Error(errorBody?.error || 'This interview session is no longer active.')
        throw new Error(errorBody?.error || 'Failed to load interview details.')
      }
      const data = await res.json()
      setMeta(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load interview')
    } finally {
      setLoading(false)
    }
  }

  const checkPermissions = async () => {
    setCheckingPermissions(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      // Stop all tracks immediately after getting permission
      stream.getTracks().forEach(t => t.stop())
      setPermissionsGranted(true)
    } catch (e) {
      setError('Camera and microphone permissions are required. Please enable them in your browser and refresh.')
    } finally {
      setCheckingPermissions(false)
    }
  }

  const startInterview = async () => {
    if (!meta) return
    setStarting(true)
    setError(null)
    try {
      // Call Python backend /api/interview/start via Next.js proxy
      const res = await fetch('/api/ai-interview/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_info: {
            name: meta.candidateName,
            email: meta.candidateEmail,
            hireverse_interview_id: meta.interviewId,
          },
          position: meta.position,
          interview_type: meta.type,
          time_limit_minutes: meta.duration,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        let errData: any = {}
        try { errData = JSON.parse(errText) } catch (e) {}
        
        throw new Error(errData.detail || errData.error || 'Failed to start interview')
      }

      const data = await res.json()
      // Store session info for the live page
      sessionStorage.setItem('ai_interview_session', JSON.stringify({
        sessionId: data.session_id,
        candidateName: meta.candidateName,
        candidateEmail: meta.candidateEmail,
        interviewId: meta.interviewId,
        position: meta.position,
        firstQuestion: data.first_question,
        introduction: data.introduction,
        totalQuestions: data.total_questions || 5,
        timeLimitMinutes: data.time_limit_minutes || 30,
        isResumed: data.status === 'resumed',
      }))
      // Go to live interview page
      router.push(`/ai-interview/${sessionId}/live`)
    } catch (err: any) {
      console.error('Start interview error:', err)
      setError(err.message || 'Could not start the interview. Please try again.')
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-gray-600">Loading your interview...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Interview</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={fetchInterviewMeta} variant="outline">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!meta) return null

  const expectedQuestionCount = getExpectedQuestionCount(meta.duration)
  const interviewTypeLabel = formatInterviewType(meta.type)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-0">
        <CardHeader className="text-center pb-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-xl text-white p-8">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">AI Voice Interview</CardTitle>
          <p className="text-indigo-100 mt-1 text-sm">
            Powered by HireVerse — Conversational AI
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          {/* Candidate Details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Interview Details</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium text-gray-800">{meta.candidateName}</span>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <span className="ml-2 font-medium text-gray-800">{meta.candidateEmail}</span>
              </div>
              <div>
                <span className="text-gray-500">Position:</span>
                <span className="ml-2 font-medium text-gray-800">{meta.position}</span>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <Badge className="ml-2 bg-indigo-100 text-indigo-700">{meta.duration} min</Badge>
              </div>
            </div>
          </div>

          {/* What to expect */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> What to Expect
            </p>
            <ul className="text-sm text-blue-800 space-y-1.5">
              <li>• You will be asked <strong>{expectedQuestionCount} {interviewTypeLabel} questions</strong> verbally</li>
              <li>• Speak your answer clearly; the AI transcribes and scores it</li>
              <li>• Total time: <strong>{meta.duration} minutes</strong> — the session auto-ends</li>
              <li>• Your camera is on for anti-cheat monitoring (eye tracking)</li>
              <li>• <strong>Do not switch tabs</strong> or leave the browser window</li>
            </ul>
          </div>

          {/* Requirements */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wide mb-2">Requirements</p>
            <div className="flex gap-6 text-sm text-yellow-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span>Camera enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                <span>Microphone enabled</span>
              </div>
            </div>
          </div>

          {/* Permission check */}
          {!permissionsGranted && (
            <Button
              onClick={checkPermissions}
              variant="outline"
              className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              disabled={checkingPermissions}
            >
              {checkingPermissions ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking permissions...</>
              ) : (
                <><Camera className="w-4 h-4 mr-2" /> Allow Camera & Microphone Access</>
              )}
            </Button>
          )}

          {permissionsGranted && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Camera and microphone access granted ✓
            </div>
          )}

          {/* Start button */}
          <Button
            onClick={startInterview}
            disabled={!permissionsGranted || starting}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
          >
            {starting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting Interview...</>
            ) : (
              'Start AI Interview →'
            )}
          </Button>

          <p className="text-center text-xs text-gray-400">
            By starting, you agree that this session may be recorded for evaluation purposes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
