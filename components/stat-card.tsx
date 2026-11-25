"use client"

import { motion } from "framer-motion"
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: number
  trend?: number
  detail?: string
  icon: LucideIcon
  index?: number
}

export function StatCard({ title, value, trend, detail, icon: Icon, index = 0 }: StatCardProps) {
  const isPositive = trend && trend > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
    >
      <Card className="group relative overflow-hidden border-border/50 bg-card hover:border-primary/20 transition-all duration-300">
        <motion.div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                <AnimatedNumber value={value} />
              </p>
              {trend !== undefined && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
                  )}
                >
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>
                    {isPositive ? "+" : ""}
                    {trend}%
                  </span>
                </div>
              )}
              {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
            </div>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"
            >
              <Icon className="h-6 w-6 text-primary" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
