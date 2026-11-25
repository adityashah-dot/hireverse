'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AIInterviewCompletePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const unwrappedParams = React.use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = unwrappedParams.sessionId
  const reason = searchParams.get('reason')

  const [result, setResult] = useState<{ finalScore?: number; status?: string } | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('ai_interview_result')
    if (raw) {
      setResult(JSON.parse(raw))
      sessionStorage.removeItem('ai_interview_result')
    }
  }, [])

  const score = result?.finalScore ?? null
  const isTimeout = reason === 'timeout'

  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-green-600'
    if (s >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Excellent'
    if (s >= 65) return 'Great'
    if (s >= 50) return 'Good'
    return 'Needs Improvement'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-2xl border-0">
        <CardContent className="p-10 text-center space-y-6">
          <div className="flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-xl">
              <CheckCircle className="w-11 h-11 text-white" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isTimeout ? 'Time is Up!' : 'Interview Completed!'}
            </h1>
            <p className="text-gray-500 text-sm">
              {isTimeout
                ? "Your 30-minute session has ended. Your answers have been recorded."
                : "Thank you for completing your AI interview. Your results are being processed."}
            </p>
          </div>

          {score !== null && (
            <div className="bg-gray-50 rounded-2xl p-6">
              <p className="text-sm text-gray-500 mb-2">Your Score</p>
              <p className={`text-5xl font-black mb-1 ${getScoreColor(score)}`}>
                {score.toFixed(1)}
              </p>
              <p className="text-gray-400 text-sm">out of 100</p>
              <div className="flex items-center justify-center gap-1 mt-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i <= Math.round(score / 20) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <p className="text-sm font-semibold text-gray-600 mt-2">{getScoreLabel(score)}</p>
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-4 text-left space-y-2">
            <p className="text-sm font-semibold text-blue-800">What happens next?</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Your answers have been transcribed and scored by AI</li>
              <li>• Results are sent to the hiring team for review</li>
              <li>• You will hear back via email about next steps</li>
            </ul>
          </div>

          <p className="text-3xl">🎉</p>
          <p className="text-sm text-gray-400">
            Good luck! The hiring team will be in touch shortly.
          </p>

          <Button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
