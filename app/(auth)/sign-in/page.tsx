"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Eye, EyeOff, ClipboardCheck, ArrowRight, AlertCircle, Chrome, Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const floatingShapes = [
  { size: 60, x: "10%", y: "20%", delay: 0 },
  { size: 40, x: "80%", y: "30%", delay: 0.5 },
  { size: 80, x: "70%", y: "70%", delay: 1 },
  { size: 50, x: "20%", y: "80%", delay: 1.5 },
  { size: 35, x: "50%", y: "10%", delay: 2 },
]

export default function SignInPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleOAuthSignIn = (provider: string) => {
    signIn(provider, { callbackUrl: '/dashboard' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    setIsLoading(false)
    if (res?.error) {
      setError("Invalid email or password")
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - gradient background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
        {/* Floating shapes */}
        {floatingShapes.map((shape, i) => (
          <motion.div
            key={i}
            className="absolute rounded-2xl bg-white/10 backdrop-blur-sm"
            style={{
              width: shape.size,
              height: shape.size,
              left: shape.x,
              top: shape.y,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 10, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 4,
              delay: shape.delay,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <span className="text-2xl font-semibold">HireVerse</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Streamline your
              <br />
              hiring process
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              The complete assessment platform for modern recruiting teams. Evaluate candidates with confidence.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-12 grid grid-cols-2 gap-6"
          >
            {[
              { label: "Active Companies", value: "2,500+" },
              { label: "Candidates Assessed", value: "150K+" },
              { label: "Avg. Time Saved", value: "40%" },
              { label: "Customer Rating", value: "4.9/5" },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-4">
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-sm text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel - sign in form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
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
              <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    className="h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-11 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
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
                <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                    />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-11" onClick={() => handleOAuthSignIn('google')}>
                  <Chrome className="mr-2 h-4 w-4" />
                  Google
                </Button>
                <Button variant="outline" className="h-11" onClick={() => handleOAuthSignIn('github')}>
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </Button>
              </div>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  Create account
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
