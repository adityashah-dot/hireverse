"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, Mail, Phone, MoreHorizontal, Shield, UserCheck, Edit, Trash2, Crown, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/page-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: "admin" | "recruiter" | "interviewer" | "hiring_manager"
  department: string
  status: "active" | "inactive" | "pending"
  hires: number
  interviews: number
  joinedAt: string
  lastActive: string
}


const roleIcons: Record<string, any> = {
  admin: Crown,
  recruiter: UserCheck,
  interviewer: Users,
  hiring_manager: Shield,
  ADMIN: Crown,
  RECRUITER: UserCheck,
  INTERVIEWER: Users,
  HIRING_MANAGER: Shield,
}

const roleColors: Record<string, string> = {
  admin: "bg-purple-500",
  recruiter: "bg-blue-500",
  interviewer: "bg-emerald-500",
  hiring_manager: "bg-amber-500",
  ADMIN: "bg-purple-500",
  RECRUITER: "bg-blue-500",
  INTERVIEWER: "bg-emerald-500",
  HIRING_MANAGER: "bg-amber-500",
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  recruiter: "Recruiter",
  interviewer: "Interviewer",
  hiring_manager: "Hiring Manager",
  ADMIN: "Admin",
  RECRUITER: "Recruiter",
  INTERVIEWER: "Interviewer",
  HIRING_MANAGER: "Hiring Manager",
}

const statusColors = {
  active: "bg-emerald-500",
  inactive: "bg-slate-500",
  pending: "bg-amber-500",
}

export default function TeamPage() {
  const { toast } = useToast()
  const [filterRole, setFilterRole] = useState<string>("all")
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("RECRUITER")
  const [isInviting, setIsInviting] = useState(false)

  const [totalHires, setTotalHires] = useState(0)
  const [totalInterviews, setTotalInterviews] = useState(0)

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((res) => setTeamMembers(res.data || []))
      .catch(() => {})
      .finally(() => setIsLoading(false))

    fetch("/api/analytics/dashboard")
      .then((r) => r.json())
      .then((res) => {
        setTotalHires(res.data?.overview?.hiredCount ?? 0)
      })
      .catch(() => {})

    fetch("/api/interviews")
      .then((r) => r.json())
      .then((res) => setTotalInterviews((res.data || []).length))
      .catch(() => {})
  }, [])

  const handleInvite = async () => {
    if (!inviteName || !inviteEmail) return
    setIsInviting(true)
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inviteName, email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTeamMembers((prev) => [...prev, data.data])
      toast({ title: "Member invited", description: `${inviteName} has been added. Temp password: ${data.tempPassword}` })
      setInviteName(""); setInviteEmail("")
    } catch (err: any) {
      toast({ title: "Failed to invite", description: err.message, variant: "destructive" })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, currentRole: string) => {
    const roles = ["ADMIN", "RECRUITER", "HIRING_MANAGER", "INTERVIEWER"]
    const currentIdx = roles.indexOf(currentRole.toUpperCase())
    const nextRole = roles[(currentIdx + 1) % roles.length]
    try {
      await fetch(`/api/team/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      })
      setTeamMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: nextRole } : m))
      toast({ title: "Role updated", description: `Changed to ${nextRole}` })
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" })
    }
  }

  const handleRemove = async (memberId: string) => {
    try {
      await fetch(`/api/team/${memberId}`, { method: "DELETE" })
      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId))
      toast({ title: "Member removed" })
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" })
    }
  }

  const filteredMembers = filterRole === "all" ? teamMembers : teamMembers.filter((m) => (m.role || "").toLowerCase() === filterRole.toLowerCase())

  const activeMembers = teamMembers.length

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="Manage your hiring team members"
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>Send an invitation to join your hiring team</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Smith" className="mt-1.5" />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" className="mt-1.5" />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECRUITER">Recruiter</SelectItem>
                      <SelectItem value="HIRING_MANAGER">Hiring Manager</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleInvite} disabled={isInviting}>
                  {isInviting ? "Inviting..." : "Send Invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Team Members", value: teamMembers.length, sublabel: `${activeMembers} active` },
          { label: "Total Hires", value: totalHires, sublabel: "All time" },
          { label: "Interviews Conducted", value: totalInterviews, sublabel: "All time" },
          {
            label: "Avg. Hires/Recruiter",
            value: Math.round(totalHires / Math.max(teamMembers.filter((m) => ["recruiter", "RECRUITER"].includes(m.role)).length, 1)),
            sublabel: "Per recruiter",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.sublabel}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="recruiter">Recruiter</SelectItem>
            <SelectItem value="interviewer">Interviewer</SelectItem>
            <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filteredMembers.length} members</Badge>
      </div>

      {/* Team Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.map((member, index) => {
          const RoleIcon = roleIcons[member.role]
          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-border/50 hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {member.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${statusColors[(member.status as keyof typeof statusColors) || "active"] || statusColors.active}`}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{member.name}</h3>
                        <p className="text-sm text-muted-foreground">{member.department}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRoleChange(member.id, member.role)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`mailto:${member.email}`, "_blank")}>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleRemove(member.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Badge className={`${roleColors[member.role]} text-white border-0 mb-4`}>
                    <RoleIcon className="mr-1 h-3 w-3" />
                    {roleLabels[member.role]}
                  </Badge>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{member.phone}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Hires</p>
                        <p className="text-lg font-bold">{member.hires}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Interviews</p>
                        <p className="text-lg font-bold">{member.interviews}</p>
                      </div>
                    </div>
                    {member.hires > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Conversion Rate</span>
                          <span className="font-medium">{Math.round((member.hires / member.interviews) * 100)}%</span>
                        </div>
                        <Progress value={(member.hires / member.interviews) * 100} className="h-1.5" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
