"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold">Page failed to load</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        {error.message || "An unexpected error occurred. Your data is safe — try refreshing."}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh page
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
