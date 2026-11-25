"use client"

import { Badge } from "@/components/ui/badge"

interface SkillBadgeProps {
  skill: string
}

export function SkillBadge({ skill }: SkillBadgeProps) {
  return (
    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0 text-xs font-medium">
      {skill}
    </Badge>
  )
}
