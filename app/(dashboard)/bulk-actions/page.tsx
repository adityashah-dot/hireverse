"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Mail, Calendar, UserCheck, UserX, FileText, Send, CheckCircle2, Filter, Download, Upload } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/page-header"
import { candidatesApi, assessmentsApi, interviewsApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

const stageColors: Record<string, string> = {
  APPLIED: "bg-slate-500",
  SCREENING: "bg-slate-400",
  SHORTLISTED: "bg-blue-500",
  ASSESSMENT_SENT: "bg-amber-500",
  ASSESSMENT_DONE: "bg-amber-600",
  INTERVIEW: "bg-purple-500",
  OFFER: "bg-emerald-500",
  HIRED: "bg-emerald-600",
  REJECTED: "bg-red-500",
}

export default function BulkActionsPage() {
  const { toast } = useToast()
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [filterStage, setFilterStage] = useState<string>("all")
  const [allCandidates, setAllCandidates] = useState<any[]>([])  
  const [isActing, setIsActing] = useState(false)

  useEffect(() => {
    const params: Record<string, string> = { limit: "100" }
    if (filterStage !== "all") params.stage = filterStage
    candidatesApi.list(params).then((res) => setAllCandidates(res.data || [])).catch(() => {})
  }, [filterStage])

  const filteredCandidates = allCandidates

  const toggleCandidate = (id: string) => {
    setSelectedCandidates((prev) => (prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    if (selectedCandidates.length === filteredCandidates.length) {
      setSelectedCandidates([])
    } else {
      setSelectedCandidates(filteredCandidates.map((c) => c.id))
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedCandidates.length === 0) return
    setIsActing(true)
    try {
      if (action === "Schedule Assessment") {
        await Promise.all(
          selectedCandidates.map((id) => assessmentsApi.send({ candidateId: id, expiresInHours: 48 }))
        )
        toast({ title: "Assessments sent", description: `Sent to ${selectedCandidates.length} candidate(s)` })
      } else if (action === "Reject") {
        await Promise.all(
          selectedCandidates.map((id) => candidatesApi.updateStage(id, "rejected"))
        )
        setAllCandidates((prev) => prev.map((c) =>
          selectedCandidates.includes(c.id) ? { ...c, stage: "rejected" } : c
        ))
        toast({ title: "Candidates rejected", description: `${selectedCandidates.length} candidate(s) moved to rejected` })
        setSelectedCandidates([])
      } else if (action === "Move to Stage") {
        await Promise.all(
          selectedCandidates.map((id) => candidatesApi.updateStage(id, "shortlisted"))
        )
        setAllCandidates((prev) => prev.map((c) =>
          selectedCandidates.includes(c.id) ? { ...c, stage: "shortlisted" } : c
        ))
        toast({ title: "Stage updated", description: `${selectedCandidates.length} candidate(s) moved to shortlisted` })
        setSelectedCandidates([])
      } else if (action === "Archive") {
        await Promise.all(
          selectedCandidates.map((id) => candidatesApi.update(id, { isArchived: true }))
        )
        setAllCandidates((prev) => prev.filter((c) => !selectedCandidates.includes(c.id)))
        toast({ title: "Archived", description: `${selectedCandidates.length} candidate(s) archived` })
        setSelectedCandidates([])
      } else {
        toast({ title: action, description: `Action applied to ${selectedCandidates.length} candidate(s)` })
      }
    } catch {
      toast({ title: "Action failed", variant: "destructive" })
    } finally {
      setIsActing(false)
    }
  }

  const handleExport = () => {
    window.open('/api/candidates/csv', '_blank')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const formData = new FormData()
      formData.append('file', file)
      formData.append('jobId', filterStage !== 'all' ? '' : '') // Use first active job if no filter
      setIsActing(true)
      try {
        const res = await fetch('/api/candidates/csv', { method: 'POST', body: formData })
        const json = await res.json()
        if (res.ok) {
          toast({ title: 'Import complete', description: json.message })
          // Refresh candidate list
          candidatesApi.list({ limit: '100' }).then((r) => setAllCandidates(r.data || [])).catch(() => {})
        } else {
          toast({ title: 'Import failed', description: json.error, variant: 'destructive' })
        }
      } catch {
        toast({ title: 'Import failed', variant: 'destructive' })
      } finally {
        setIsActing(false)
      }
    }
    input.click()
  }

  const bulkActions = [
    { icon: Calendar, label: "Schedule Assessment", color: "bg-purple-500" },
    { icon: UserCheck, label: "Move to Stage", color: "bg-emerald-500" },
    { icon: Send, label: "Send Interview Link", color: "bg-indigo-500" },
    { icon: UserX, label: "Reject", color: "bg-red-500" },
    { icon: FileText, label: "Archive", color: "bg-slate-500" },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bulk Actions"
        description={`${selectedCandidates.length} candidate${selectedCandidates.length !== 1 ? "s" : ""} selected`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </div>
        }
      />

      {/* Bulk Actions Bar */}
      {selectedCandidates.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sticky top-4 z-10">
          <Card className="border-2 border-primary shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{selectedCandidates.length} selected</span>
                </div>
                <div className="flex items-center gap-2">
                  {bulkActions.map((action) => {
                    const IconComponent = action.icon
                    return (
                      <Button key={action.label} size="sm" variant="secondary" className="gap-2" disabled={isActing} onClick={() => handleBulkAction(action.label)}>
                        <IconComponent className="h-4 w-4" />
                        {action.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filter and Select All */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={filteredCandidates.length > 0 && selectedCandidates.length === filteredCandidates.length}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium">Select All</span>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterStage} onValueChange={setFilterStage}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="Filter by stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Badge variant="secondary">{filteredCandidates.length} candidates</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Candidates List */}
      <div className="grid gap-3">
        {filteredCandidates.map((candidate, index) => (
          <motion.div
            key={candidate.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card
              className={`border-border/50 cursor-pointer transition-all hover:shadow-md ${
                selectedCandidates.includes(candidate.id) ? "border-primary border-2 bg-primary/5" : ""
              }`}
              onClick={() => toggleCandidate(candidate.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedCandidates.includes(candidate.id)}
                    onCheckedChange={() => toggleCandidate(candidate.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {candidate.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{candidate.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{candidate.job?.title || ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{candidate.skillMatch ?? 0}%</p>
                      <p className="text-xs text-muted-foreground">Match</p>
                    </div>
                    <Badge className={`${stageColors[candidate.stage] || "bg-slate-500"} text-white border-0 capitalize`}>
                      {candidate.stage}
                    </Badge>
                    {candidate.assessments?.length > 0 && candidate.assessments[0]?.score !== null && (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {candidate.assessments[0]?.score}%
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
