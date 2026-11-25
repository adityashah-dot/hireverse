"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Brain,
  Award, HelpCircle, User, BarChart2, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/page-header"

export default function AssessmentResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [assessment, setAssessment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/assessments/results/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error)
        else setAssessment(res.data)
      })
      .catch(() => setError("Failed to load assessment results"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !assessment) {
    return (
      <div className="flex items-center justify-center h-64 flex-col gap-3">
        <Brain className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">{error || "Assessment not found"}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    )
  }

  const responses: any[] = assessment.responses ?? []
  const correctCount = responses.filter((r) => r.isCorrect).length
  const total = responses.length || assessment.totalQuestions || 0
  const score = assessment.score ?? (total > 0 ? Math.round((correctCount / total) * 100) : 0)
  const timeTaken =
    assessment.startedAt && assessment.completedAt
      ? Math.round(
          (new Date(assessment.completedAt).getTime() - new Date(assessment.startedAt).getTime()) / 60000,
        )
      : assessment.duration ?? null

  const scoreColor =
    score >= 80 ? "text-green-500" : score >= 50 ? "text-amber-500" : "text-red-500"

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assessment Results"
        description={`${assessment.candidate?.name ?? "Candidate"} — ${assessment.job?.title ?? "Role"}`}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Score</p>
              <p className={`text-3xl font-bold ${scoreColor}`}>{score}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Correct</p>
              <p className="text-3xl font-bold text-green-500">{correctCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Incorrect</p>
              <p className="text-3xl font-bold text-red-500">{total - correctCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-3xl font-bold text-blue-500">
                {timeTaken !== null ? `${timeTaken}m` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Candidate summary */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {assessment.candidate?.name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("") ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-lg">{assessment.candidate?.name}</p>
            <p className="text-sm text-muted-foreground">{assessment.candidate?.email}</p>
            {assessment.candidate?.aiSummary && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {assessment.candidate.aiSummary}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`text-2xl font-bold ${scoreColor}`}>{score}%</span>
            <Progress value={score} className="w-40 h-2" />
            <span className="text-xs text-muted-foreground">
              {correctCount} / {total} correct
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Per-Question Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Question Breakdown</h2>
          <Badge variant="secondary">{total} questions</Badge>
        </div>

        {responses.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No responses recorded yet — candidate may not have started.
            </CardContent>
          </Card>
        )}

        {responses.map((response: any, index: number) => {
          const q = response.question
          if (!q) return null
          const options: string[] = Array.isArray(q.options) ? q.options : []
          const selectedIdx: number = response.selectedAnswer
          const correctIdx: number = q.correctAnswer

          return (
            <motion.div
              key={response.id ?? index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.025 }}
            >
              <Card
                className={
                  response.isCorrect
                    ? "border-green-500/30 bg-green-500/[0.02]"
                    : "border-red-500/30 bg-red-500/[0.02]"
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    {/* Number badge */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        response.isCorrect
                          ? "bg-green-500/15 text-green-500"
                          : "bg-red-500/15 text-red-500"
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground leading-snug">{q.text}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {q.category && (
                          <Badge variant="secondary" className="text-xs">
                            {q.category}
                          </Badge>
                        )}
                        {q.difficulty && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {q.difficulty.toLowerCase()}
                          </Badge>
                        )}
                        {response.isCorrect ? (
                          <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Correct
                          </span>
                        ) : (
                          <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Incorrect
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 pt-0">
                  {options.map((opt: string, i: number) => {
                    const isCorrectAnswer = i === correctIdx
                    const isSelected = i === selectedIdx
                    const isWrongSelection = isSelected && !isCorrectAnswer

                    let cls =
                      "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm border transition-colors "
                    if (isCorrectAnswer)
                      cls += "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400 font-medium"
                    else if (isWrongSelection)
                      cls += "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                    else cls += "border-border/50 text-muted-foreground"

                    return (
                      <div key={i} className={cls}>
                        <span className="font-semibold w-5 shrink-0">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isCorrectAnswer && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        )}
                        {isWrongSelection && (
                          <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                        )}
                      </div>
                    )
                  })}

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-500/5 border border-blue-500/20 px-4 py-3">
                      <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-600 dark:text-blue-400">{q.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
