"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { MapPin, Clock, DollarSign, ArrowRight, Search, Sparkles, Building2, Users, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ThemeToggle } from "@/components/theme-toggle"
import { publicApi } from "@/lib/api"

export default function CareersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [department, setDepartment] = useState("all")
  const [location, setLocation] = useState("all")
  const [allJobs, setAllJobs] = useState<any[]>([])

  useEffect(() => {
    publicApi.listJobs().then((res) => setAllJobs(res.data || [])).catch(() => {})
  }, [])

  const filteredJobs = allJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDepartment = department === "all" || job.department === department
    const matchesLocation = location === "all" || (job.location || "").includes(location)
    return matchesSearch && matchesDepartment && matchesLocation
  })

  const departments = [...new Set(allJobs.map((job: any) => job.department).filter(Boolean))]
  const locations = [...new Set(allJobs.map((job: any) => (job.location || "").split(",")[0].trim()).filter(Boolean))]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">HireVerse</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link href="/sign-in">Employer Login</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Building2 className="w-4 h-4" />
              Join Our Team
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Build the Future of <span className="text-primary">Hiring</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
              We're on a mission to transform how companies find and hire talent. Join us and help shape the future of
              recruitment.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>50+ Team Members</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Remote First</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 border-b border-border/50 bg-muted/30 sticky top-16 z-30 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-full md:w-48 bg-background">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="w-full md:w-48 bg-background">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredJobs.length}</span> open positions
            </p>
          </div>

          <div className="space-y-4">
            {filteredJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link href={`/apply/${job.slug}`}>
                  <Card className="p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group cursor-pointer">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {job.department}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {job.experienceLevel}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" />
                            {job.salaryMin && job.salaryMax ? `${job.salaryCurrency || '$'}${(job.salaryMin / 1000).toFixed(0)}k - ${(job.salaryMax / 1000).toFixed(0)}k` : job.salaryMin ? `From ${job.salaryCurrency || '$'}${(job.salaryMin / 1000).toFixed(0)}k` : "Competitive"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-wrap gap-1.5">
                          {job.skills.slice(0, 3).map((skill: string) => (
                            <Badge key={skill} variant="outline" className="text-xs font-normal">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No positions found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Don't see the right role?</h2>
          <p className="text-muted-foreground mb-6">
            We're always looking for talented people. Send us your resume and we'll keep you in mind for future
            opportunities.
          </p>
          <Button size="lg" onClick={() => window.location.href = "mailto:careers@hireverse.app?subject=Open Application"}>
            Send Open Application
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Powered by HireVerse</span>
          </div>
          <div>© 2025 All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
