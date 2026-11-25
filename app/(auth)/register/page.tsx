"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Eye, EyeOff, ClipboardCheck, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Registration failed")
        setIsLoading(false)
        return
      }

      const signInRes = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      if (signInRes?.error) {
        setError("Account created. Please sign in.")
        router.push("/sign-in")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setIsLoading(false)
    }
  }

  const features = [
    "AI-powered resume parsing",
    "Automated skill matching",
    "Dynamic MCQ assessments",
    "Complete hiring pipeline",
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <span className="text-2xl font-semibold">HireVerse</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Start hiring smarter,
              <br />
              not harder
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-md mb-10">
              Join thousands of companies using AI to find, assess, and hire the best candidates faster.
            </p>
            <div className="space-y-3">
              {features.map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-white/80 shrink-0" />
                  <span className="text-primary-foreground/90">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 grid grid-cols-2 gap-6"
          >
            {[
              { label: "Free to start", value: "14-day trial" },
              { label: "Setup time", value: "< 5 minutes" },
              { label: "No credit card", value: "required" },
              { label: "Cancel anytime", value: "no lock-in" },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-4">
                <p className="text-lg font-semibold">{stat.value}</p>
                <p className="text-sm text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="space-y-1 px-0">
              <div className="flex items-center gap-3 mb-4 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                  <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-semibold">HireVerse</span>
              </div>
              <CardTitle className="text-2xl font-semibold">Create your account</CardTitle>
              <CardDescription>Set up your company workspace in minutes</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Acme Corp"
                    className="h-11"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Your Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Jane Smith"
                    className="h-11"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@company.com"
                    className="h-11"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      className="h-11 pr-10"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={8}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-11 w-11"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                    />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                By creating an account, you agree to our{" "}
                <Link href="#" className="underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="#" className="underline">Privacy Policy</Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
