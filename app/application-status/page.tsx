"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Mail, FileText, MapPin, Building, Clock, ArrowRight, CheckCircle2, XCircle, AlertCircle, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const stageOrder = [
  "APPLIED", "SCREENING", "SHORTLISTED", "ASSESSMENT_SENT", "ASSESSMENT_DONE",
  "INTERVIEW", "OFFER", "HIRED",
]

const stageLabels: Record<string, string> = {
  APPLIED: "Applied", SCREENING: "Screening", SHORTLISTED: "Shortlisted",
  ASSESSMENT_SENT: "Assessment Sent", ASSESSMENT_DONE: "Assessment Done",
  INTERVIEW: "Interview", OFFER: "Offer", HIRED: "Hired",
}

const stageIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  APPLIED: FileText,
  SCREENING: Search,
  SHORTLISTED: CheckCircle2,
  ASSESSMENT_SENT: Mail,
  ASSESSMENT_DONE: Timer,
  INTERVIEW: FileText,
  OFFER: FileText,
  HIRED: CheckCircle2,
}

const stageColors: Record<string, string> = {
  APPLIED: "bg-slate-500", SCREENING: "bg-slate-400", SHORTLISTED: "bg-blue-500",
  ASSESSMENT_SENT: "bg-amber-500", ASSESSMENT_DONE: "bg-amber-600",
  INTERVIEW: "bg-purple-500", OFFER: "bg-emerald-500", HIRED: "bg-emerald-600",
  REJECTED: "bg-red-500",
}

interface AppData {
  name: string
  position: string
  company: string
  department: string
  location: string
  stage: string
  stageMessage: string
  appliedAt: string
  skillMatch: number | null
  latestAssessmentScore: number | null
  latestAssessmentStatus: string | null
  latestUpdate: { message: string; at: string } | null
}

export default function ApplicationStatusPage() {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AppData | null>(null)

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/application-status?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load status")
      setData(json.data)
    } catch (err: any) {
      setError(err.message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const currentStageIndex = data ? stageOrder.indexOf(data.stage) : -1
  const progressPercent = data ? Math.round(((currentStageIndex + 1) / stageOrder.length) * 100) : 0
  const isRejected = data?.stage === "REJECTED"
  const isHired = data?.stage === "HIRED"

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      <div className="container max-w-2xl mx-auto py-12 px-4 flex-1">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 mb-4">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Application Status</h1>
          <p className="text-muted-foreground mt-2">Check where your application stands</p>
        </div>

        <Card className="border-border/50 mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleCheck} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Application Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="From your confirmation email"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Checking..." : <>Check Status <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/50 bg-destructive/5 mb-8">
            <CardContent className="py-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {data && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{data.position}</CardTitle>
                  {isRejected ? (
                    <Badge className="bg-red-500 text-white">Rejected</Badge>
                  ) : isHired ? (
                    <Badge className="bg-emerald-500 text-white">Hired!</Badge>
                  ) : (
                    <Badge variant="secondary">In Progress</Badge>
                  )}
                </div>
                <CardDescription>{data.company}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="h-4 w-4" /> {data.department}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {data.location || "Not specified"}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" /> Applied {new Date(data.appliedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{stageLabels[data.stage] || data.stage}</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Stage indicator */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
                  {(() => {
                    const Icon = stageIcons[data.stage] || FileText
                    return <Icon className="h-5 w-5 text-primary" />
                  })()}
                  <p className="text-sm">{data.stageMessage}</p>
                </div>

                {/* Assessment score */}
                {data.latestAssessmentScore != null && (
                  <div className="p-4 rounded-xl border border-border">
                    <p className="text-sm text-muted-foreground mb-2">Assessment Score</p>
                    <div className="flex items-center gap-3">
                      <span className={`text-3xl font-bold ${data.latestAssessmentScore >= 70 ? "text-emerald-500" : data.latestAssessmentScore >= 50 ? "text-amber-500" : "text-red-500"}`}>
                        {data.latestAssessmentScore}%
                      </span>
                      {data.latestAssessmentStatus === "COMPLETED" && (
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-600">Completed</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Latest update */}
                {data.latestUpdate && (
                  <div className="p-4 rounded-xl border border-border">
                    <p className="text-sm text-muted-foreground mb-1">Latest Update</p>
                    <p className="text-sm">{data.latestUpdate.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(data.latestUpdate.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
        Powered by HireVerse
      </footer>
    </div>
  )
}
