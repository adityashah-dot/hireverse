"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const stageConfig: Record<string, { label: string; className: string }> = {
  // UPPERCASE — actual DB enum values
  APPLIED: { label: "Applied", className: "bg-slate-500 hover:bg-slate-600" },
  SCREENING: { label: "Screening", className: "bg-cyan-500 hover:bg-cyan-600" },
  SHORTLISTED: { label: "Shortlisted", className: "bg-blue-500 hover:bg-blue-600" },
  ASSESSMENT_SENT: { label: "Assessment Sent", className: "bg-amber-500 hover:bg-amber-600" },
  ASSESSMENT_DONE: { label: "Assessment Done", className: "bg-orange-500 hover:bg-orange-600" },
  INTERVIEW: { label: "Interview", className: "bg-purple-500 hover:bg-purple-600" },
  OFFER: { label: "Offer", className: "bg-emerald-500 hover:bg-emerald-600" },
  HIRED: { label: "Hired", className: "bg-emerald-600 hover:bg-emerald-700" },
  REJECTED: { label: "Rejected", className: "bg-red-500 hover:bg-red-600" },
  // lowercase aliases for backward compatibility
  applied: { label: "Applied", className: "bg-slate-500 hover:bg-slate-600" },
  shortlisted: { label: "Shortlisted", className: "bg-blue-500 hover:bg-blue-600" },
  assessment: { label: "Assessment", className: "bg-amber-500 hover:bg-amber-600" },
  interview: { label: "Interview", className: "bg-purple-500 hover:bg-purple-600" },
  offer: { label: "Offer", className: "bg-emerald-500 hover:bg-emerald-600" },
  hired: { label: "Hired", className: "bg-emerald-600 hover:bg-emerald-700" },
  rejected: { label: "Rejected", className: "bg-red-500 hover:bg-red-600" },
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // UPPERCASE — actual DB enum values
  ACTIVE: { label: "Active", className: "bg-emerald-500 hover:bg-emerald-600" },
  DRAFT: { label: "Draft", className: "bg-slate-500 hover:bg-slate-600" },
  CLOSED: { label: "Closed", className: "bg-red-500 hover:bg-red-600" },
  PENDING: { label: "Pending", className: "bg-amber-500 hover:bg-amber-600" },
  SCHEDULED: { label: "Scheduled", className: "bg-blue-500 hover:bg-blue-600" },
  COMPLETED: { label: "Completed", className: "bg-emerald-500 hover:bg-emerald-600" },
  EXPIRED: { label: "Expired", className: "bg-red-500 hover:bg-red-600" },
  IN_PROGRESS: { label: "In Progress", className: "bg-purple-500 hover:bg-purple-600" },
  CANCELLED: { label: "Cancelled", className: "bg-red-500 hover:bg-red-600" },
  // lowercase aliases
  active: { label: "Active", className: "bg-emerald-500 hover:bg-emerald-600" },
  draft: { label: "Draft", className: "bg-slate-500 hover:bg-slate-600" },
  closed: { label: "Closed", className: "bg-red-500 hover:bg-red-600" },
  pending: { label: "Pending", className: "bg-amber-500 hover:bg-amber-600" },
  scheduled: { label: "Scheduled", className: "bg-blue-500 hover:bg-blue-600" },
  completed: { label: "Completed", className: "bg-emerald-500 hover:bg-emerald-600" },
  expired: { label: "Expired", className: "bg-red-500 hover:bg-red-600" },
  "in-progress": { label: "In Progress", className: "bg-purple-500 hover:bg-purple-600" },
}

interface StageBadgeProps {
  stage?: string
  status?: string
  animate?: boolean
}

export function StageBadge({ stage, status, animate = true }: StageBadgeProps) {
  const config = stage ? stageConfig[stage] : status ? statusConfig[status] : null

  if (!config) return null

  const badge = (
    <Badge variant="secondary" className={cn("border-0 text-white text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  )

  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {badge}
      </motion.div>
    )
  }

  return badge
}
