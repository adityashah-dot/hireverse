"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Briefcase,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  Search,
  Bell,
  ChevronLeft,
  Menu,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown,
  Kanban,
  Video,
  Sparkles,
  Calendar,
  Command,
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAppStore } from "@/lib/store"
import { useIsMobile } from "@/hooks/use-mobile"
import { signOut, useSession } from "next-auth/react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const departments = ["Engineering", "Design", "Data", "Marketing", "Sales", "HR"]

// Grouped navigation for cleaner sidebar
const navigationGroups = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Jobs", href: "/jobs", icon: Briefcase },
      { name: "Candidates", href: "/candidates", icon: Users },
      { name: "Pipeline", href: "/pipeline", icon: Kanban },
    ],
  },
  {
    label: "Hiring",
    items: [
      { name: "Assessments", href: "/assessments", icon: ClipboardCheck },
      { name: "Interviews", href: "/interviews", icon: Video },
      { name: "Calendar", href: "/calendar", icon: Calendar },
    ],
  },
  {
    label: "Insights",
    items: [
      { name: "AI Insights", href: "/ai-insights", icon: Sparkles },
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
]

// Settings shown separately at bottom
const settingsItem = { name: "Settings", href: "/settings", icon: Settings }

const shortcuts = [
  { key: "D", label: "Dashboard", href: "/dashboard" },
  { key: "J", label: "Jobs", href: "/jobs" },
  { key: "C", label: "Candidates", href: "/candidates" },
  { key: "P", label: "Pipeline", href: "/pipeline" },
  { key: "A", label: "Assessments", href: "/assessments" },
  { key: "I", label: "AI Insights", href: "/ai-insights" },
  { key: "R", label: "Reports", href: "/reports" },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()
  const { sidebarCollapsed, toggleSidebar } = useAppStore()
  const isMobile = useIsMobile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { data: session } = useSession()

  const currentDept = searchParams.get('department') || 'all'

  const handleDepartmentChange = (dept: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (dept === 'all') {
      params.delete('department')
    } else {
      params.set('department', dept)
    }
    const qs = params.toString()
    router.push(pathname + (qs ? `?${qs}` : ''))
  }

  useEffect(() => { setMounted(true) }, [])

  // Use false during SSR to avoid hydration mismatch, real value after mount
  const collapsed = mounted ? sidebarCollapsed : false

  const currentUser = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    role: (session?.user as any)?.role?.toLowerCase() || "recruiter",
  }

  const sidebarWidth = collapsed ? 80 : 280

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open command palette with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCommandOpen(true)
        return
      }

      // Only process shortcuts when command palette is open
      if (!commandOpen) return

      const shortcut = shortcuts.find((s) => s.key.toLowerCase() === e.key.toLowerCase())
      if (shortcut) {
        e.preventDefault()
        router.push(shortcut.href)
        setCommandOpen(false)
      }

      if (e.key === "Escape") {
        setCommandOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [commandOpen, router])

  return (
    <div className="flex min-h-screen bg-background">
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Type a command or search..."
                className="border-0 p-0 h-auto focus-visible:ring-0 text-base"
                autoFocus
              />
            </div>
          </div>
          <div className="p-2 max-h-[300px] overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Quick Navigation</p>
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.key}
                onClick={() => {
                  router.push(shortcut.href)
                  setCommandOpen(false)
                }}
                className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm">{shortcut.label}</span>
                <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono">{shortcut.key}</kbd>
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-border bg-muted/50">
            <p className="text-xs text-muted-foreground text-center">
              Press <kbd className="px-1.5 py-0.5 rounded bg-background text-[10px] font-mono mx-1">ESC</kbd> to close
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(isMobile ? mobileMenuOpen : true) && (
          <>
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
            )}
            <motion.aside
              initial={isMobile ? { x: -280 } : false}
              animate={{
                width: isMobile ? 280 : sidebarWidth,
                x: 0,
              }}
              exit={isMobile ? { x: -280 } : undefined}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "fixed left-0 top-0 z-50 h-screen border-r border-border bg-sidebar",
                isMobile ? "shadow-2xl" : "",
              )}
            >
              <div className="flex h-full flex-col">
                {/* Logo */}
                <div className="flex h-16 items-center justify-between px-4 border-b border-border">
                  <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                      <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="font-semibold text-foreground whitespace-nowrap overflow-hidden"
                        >
                          HireVerse
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                  {!isMobile && (
                    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
                      <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronLeft className="h-4 w-4" />
                      </motion.div>
                    </Button>
                  )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 overflow-y-auto">
                  <div className="space-y-6">
                    {navigationGroups.map((group) => (
                      <div key={group.label}>
                        {/* Group Label */}
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2"
                            >
                              {group.label}
                            </motion.p>
                          )}
                        </AnimatePresence>
                        
                        {/* Group Items */}
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                            return (
                              <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors relative",
                                    isActive
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                  )}
                                >
                                  <item.icon className="h-5 w-5 shrink-0" />
                                  <AnimatePresence>
                                    {!collapsed && (
                                      <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: "auto" }}
                                        exit={{ opacity: 0, width: 0 }}
                                        className="whitespace-nowrap overflow-hidden"
                                      >
                                        {item.name}
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                </motion.div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Settings at bottom of nav */}
                  <div className="mt-6 pt-4 border-t border-border/50">
                    <Link href={settingsItem.href} onClick={() => setMobileMenuOpen(false)}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors relative",
                          pathname === settingsItem.href
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <settingsItem.icon className="h-5 w-5 shrink-0" />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              className="whitespace-nowrap overflow-hidden"
                            >
                              {settingsItem.name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </Link>
                  </div>
                </nav>

                {/* User section */}
                <div className="border-t border-border p-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-3 px-3 py-2.5 h-auto",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {currentUser.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.div
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              className="flex flex-1 items-center justify-between overflow-hidden"
                            >
                              <div className="text-left">
                                <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                              </div>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => router.push("/settings")}>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => signOut({ callbackUrl: "/sign-in" })}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: isMobile ? 0 : sidebarWidth }}>
        {/* Top navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-6">
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <button
              onClick={() => setCommandOpen(true)}
              className="relative hidden md:flex items-center gap-2 w-80 h-9 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground flex-1">Search candidates, jobs...</span>
              <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-background text-[10px] font-mono text-muted-foreground">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Select value={currentDept} onValueChange={handleDepartmentChange}>
              <SelectTrigger className="w-40 h-9 text-sm bg-muted/50 border-0">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept.toLowerCase()}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" className="relative" onClick={() => router.push("/notifications")}>
              <Bell className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {!mounted ? (
                <Sun className="h-5 w-5" />
              ) : (
                <motion.div
                  initial={false}
                  animate={{ rotate: theme === "dark" ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </motion.div>
              )}
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
