"use client"

import type React from "react"

import { useRef } from "react"
import Link from "next/link"
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion"
import {
  ArrowRight,
  Brain,
  Users,
  BarChart3,
  Shield,
  Target,
  FileText,
  CheckCircle2,
  Sparkles,
  Play,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.span ref={ref} initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}}>
      <motion.span initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
        {isInView ? value : 0}
        {suffix}
      </motion.span>
    </motion.span>
  )
}

function FloatingOrb({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-20 ${className}`}
      animate={{
        y: [0, -30, 0],
        scale: [1, 1.1, 1],
        opacity: [0.2, 0.3, 0.2],
      }}
      transition={{
        duration: 8,
        repeat: Number.POSITIVE_INFINITY,
        delay,
        ease: "easeInOut",
      }}
    />
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  index: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm p-6 h-full transition-all duration-500 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
      </Card>
    </motion.div>
  )
}

function ProcessStep({
  number,
  title,
  description,
  index,
}: {
  number: string
  title: string
  description: string
  index: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -60 : 60 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="flex items-start gap-6"
    >
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg shadow-primary/25">
        {number}
      </div>
      <div className="pt-1">
        <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })

  const heroOpacity = useTransform(heroScrollProgress, [0, 0.5], [1, 0])
  const heroScale = useTransform(heroScrollProgress, [0, 0.5], [1, 0.95])
  const heroY = useTransform(heroScrollProgress, [0, 0.5], [0, 100])

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  const scaleX = useTransform(smoothProgress, [0, 1], [0, 1])

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Matching",
      description:
        "Semantic analysis matches candidates to job requirements using advanced transformer models, not just keywords.",
    },
    {
      icon: FileText,
      title: "Smart Resume Parsing",
      description:
        "Automatically extract structured data from resumes with AI-powered parsing and OCR fallback for scanned documents.",
    },
    {
      icon: Target,
      title: "Dynamic Assessments",
      description:
        "Generate role-specific MCQ tests on-the-fly with scenario-based questions tailored to experience level.",
    },
    {
      icon: Shield,
      title: "Secure Testing",
      description:
        "Browser fingerprinting, 24-hour link expiry, and one-time use sessions ensure assessment integrity.",
    },
    {
      icon: Users,
      title: "Visual Pipeline",
      description:
        "Drag-and-drop candidates through hiring stages with real-time updates and complete activity tracking.",
    },
    {
      icon: BarChart3,
      title: "Deep Analytics",
      description:
        "Track hiring metrics, conversion rates, and team performance with comprehensive reporting dashboards.",
    },
  ]

  const processSteps = [
    {
      number: "01",
      title: "Post Jobs & Collect Applications",
      description:
        "Create job listings with AI-parsed requirements. Candidates apply via public links or email—resumes are auto-ingested.",
    },
    {
      number: "02",
      title: "AI Parsing & Skill Matching",
      description:
        "Resumes are parsed into structured data. AI matches candidates against job requirements and generates skill match scores.",
    },
    {
      number: "03",
      title: "Schedule Assessments",
      description:
        "Shortlisted candidates receive secure assessment links. AI generates fresh, role-specific questions for each test.",
    },
    {
      number: "04",
      title: "Evaluate & Hire",
      description:
        "Review scores, conduct interviews, and move candidates through your pipeline. All activity is logged for compliance.",
    },
  ]

  return (
    <div ref={containerRef} className="relative bg-background">
      {/* Progress bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left" style={{ scaleX }} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">HireVerse</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it Works
            </Link>
            <Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Careers
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button size="sm" className="shadow-lg shadow-primary/25" asChild>
              <Link href="/sign-in">
                Get Started
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
      >
        {/* Animated background orbs */}
        <FloatingOrb className="w-[600px] h-[600px] bg-primary -top-40 -right-40" delay={0} />
        <FloatingOrb className="w-[500px] h-[500px] bg-chart-2 -bottom-20 -left-20" delay={2} />
        <FloatingOrb
          className="w-[400px] h-[400px] bg-chart-3 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          delay={4}
        />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              AI-Powered Recruitment Platform
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-6 tracking-tight text-balance"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            Hire Smarter.
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-chart-2 bg-clip-text text-transparent">
              Hire Faster.
            </span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 text-pretty"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            The complete hiring workspace that combines ATS, AI resume matching, and intelligent assessments in one
            seamless platform.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <Button size="lg" className="h-14 px-8 text-lg shadow-xl shadow-primary/25 group" asChild>
              <Link href="/sign-in">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-14 px-8 text-lg group bg-transparent">
              <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            {[
              { value: 85, suffix: "%", label: "Faster Hiring" },
              { value: 10, suffix: "k+", label: "Candidates Processed" },
              { value: 94, suffix: "%", label: "Match Accuracy" },
              { value: 500, suffix: "+", label: "Companies Trust Us" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-foreground mb-1">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="flex flex-col items-center text-muted-foreground"
            >
              <span className="text-xs mb-2">Scroll to explore</span>
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Everything you need to hire
              <br />
              <span className="text-primary">the best talent</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              From resume ingestion to offer letters, HireVerse handles the entire recruitment workflow with AI at every
              step.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Product Preview Section */}
      <section className="py-32 relative overflow-hidden">
        <FloatingOrb className="w-[800px] h-[800px] bg-primary top-0 left-1/2 -translate-x-1/2" delay={1} />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Beautiful. Powerful. <span className="text-primary">Intuitive.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A modern interface designed for recruiters who move fast.
            </p>
          </motion.div>

          {/* Dashboard preview mockup */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <div className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
                <div className="w-3 h-3 rounded-full bg-destructive/70" />
                <div className="w-3 h-3 rounded-full bg-chart-4/70" />
                <div className="w-3 h-3 rounded-full bg-primary/70" />
                <div className="ml-4 flex-1 h-6 rounded bg-muted/50 max-w-xs" />
              </div>
              <div className="aspect-[16/9] bg-gradient-to-br from-background via-muted/20 to-background p-6">
                <div className="grid grid-cols-12 gap-4 h-full">
                  {/* Sidebar mock */}
                  <div className="col-span-2 rounded-xl bg-muted/30 p-3 space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className={`h-8 rounded-lg ${i === 0 ? "bg-primary/20" : "bg-muted/50"}`} />
                    ))}
                  </div>
                  {/* Main content mock */}
                  <div className="col-span-10 space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 rounded-xl bg-muted/30 p-4">
                          <div className="w-8 h-8 rounded-lg bg-primary/20 mb-2" />
                          <div className="h-4 w-1/2 rounded bg-muted/50" />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      <div className="h-48 rounded-xl bg-muted/30" />
                      <div className="h-48 rounded-xl bg-muted/30" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating cards */}
            <motion.div
              className="absolute -right-6 top-1/4 w-64 rounded-xl bg-card border border-border shadow-xl p-4"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">Assessment Complete</div>
                  <div className="text-xs text-muted-foreground">Sarah Chen scored 92%</div>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[92%] bg-primary rounded-full" />
              </div>
            </motion.div>

            <motion.div
              className="absolute -left-6 bottom-1/4 w-56 rounded-xl bg-card border border-border shadow-xl p-4"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">AI Match Score</span>
              </div>
              <div className="text-3xl font-bold text-foreground">94%</div>
              <div className="text-xs text-muted-foreground">Skills aligned with job requirements</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-32 bg-muted/30">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              How it <span className="text-primary">works</span>
            </h2>
            <p className="text-lg text-muted-foreground">Four simple steps from job posting to successful hire.</p>
          </motion.div>

          <div className="space-y-12">
            {processSteps.map((step, i) => (
              <ProcessStep key={i} {...step} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <FloatingOrb className="w-[600px] h-[600px] bg-primary top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">
              Ready to transform your hiring?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 text-pretty">
              Join hundreds of companies already using HireVerse to find and hire exceptional talent.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-lg shadow-xl shadow-primary/25" asChild>
                <Link href="/sign-in">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg bg-transparent">
                Talk to Sales
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">HireVerse</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">© 2025 HireVerse. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
