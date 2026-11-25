"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  User,
  Briefcase,
  ClipboardCheck,
  Calendar,
  AlertCircle,
  Settings,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  type: "candidate" | "job" | "assessment" | "interview" | "system"
  title: string
  description: string
  timestamp: string
  read: boolean
  actionUrl?: string
}

function activityToNotification(a: any): Notification {
  const actionMap: Record<string, Notification["type"]> = {
    application_received: "candidate",
    stage_changed: "candidate",
    assessment_sent: "assessment",
    assessment_completed: "assessment",
    interview_scheduled: "interview",
    interview_completed: "interview",
    note_added: "candidate",
  }
  const titleMap: Record<string, string> = {
    application_received: "New Application",
    stage_changed: "Stage Changed",
    assessment_sent: "Assessment Sent",
    assessment_completed: "Assessment Completed",
    interview_scheduled: "Interview Scheduled",
    interview_completed: "Interview Completed",
    note_added: "Note Added",
  }
  return {
    id: a.id,
    type: actionMap[a.action] || "system",
    title: titleMap[a.action] || a.action,
    description: a.details?.message || `${a.action.replace(/_/g, " ")} for ${a.candidate?.name || "candidate"}`,
    timestamp: a.createdAt,
    read: false,
    actionUrl: a.candidateId ? `/candidates/${a.candidateId}` : undefined,
  }
}

const typeIcons = {
  candidate: User,
  job: Briefcase,
  assessment: ClipboardCheck,
  interview: Calendar,
  system: AlertCircle,
}

const typeColors = {
  candidate: "bg-blue-500",
  job: "bg-emerald-500",
  assessment: "bg-amber-500",
  interview: "bg-purple-500",
  system: "bg-slate-500",
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notificationList, setNotificationList] = useState<Notification[]>([])
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setNotificationList(res.data.map(activityToNotification))
      })
      .catch(() => {})
  }, [])

  const unreadCount = notificationList.filter((n) => !n.read).length

  const filteredNotifications =
    activeTab === "all"
      ? notificationList
      : activeTab === "unread"
        ? notificationList.filter((n) => !n.read)
        : notificationList.filter((n) => n.type === activeTab)

  const markAsRead = (id: string) => {
    setNotificationList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotificationList((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotificationList((prev) => prev.filter((n) => n.id !== id))
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return "Yesterday"
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description={`You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 bg-transparent">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Notifications List */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread" className="gap-2">
                Unread
                {unreadCount > 0 && (
                  <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">{unreadCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="candidate">Candidates</TabsTrigger>
              <TabsTrigger value="assessment">Assessments</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4 space-y-3">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification, index) => {
                  const TypeIcon = typeIcons[notification.type]
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card
                        className={`border-border/50 transition-all hover:shadow-md ${!notification.read ? "bg-primary/5 border-primary/20" : ""}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={`h-10 w-10 rounded-full ${typeColors[notification.type]} flex items-center justify-center flex-shrink-0`}
                            >
                              <TypeIcon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className={`text-sm ${!notification.read ? "font-semibold" : "font-medium"}`}>
                                    {notification.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-0.5">{notification.description}</p>
                                </div>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {formatTime(notification.timestamp)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-3">
                                {notification.actionUrl && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent">
                                    View Details
                                  </Button>
                                )}
                                {!notification.read && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => markAsRead(notification.id)}
                                  >
                                    <Check className="mr-1 h-3 w-3" />
                                    Mark Read
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-destructive hover:text-destructive"
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {!notification.read && (
                              <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })
              ) : (
                <Card className="border-border/50">
                  <CardContent className="py-12 text-center">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No notifications to show</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Notification Settings */}
        <Card className="border-border/50 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Notification Settings</CardTitle>
            <CardDescription>Configure your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "New Applications", description: "When candidates apply to jobs", enabled: true },
              { label: "Assessment Updates", description: "Completion and expiry alerts", enabled: true },
              { label: "Interview Reminders", description: "30 minutes before interviews", enabled: true },
              { label: "Job Post Alerts", description: "Expiring and performance updates", enabled: false },
              { label: "Team Activity", description: "When team members take actions", enabled: false },
              { label: "Weekly Reports", description: "Summary of hiring activity", enabled: true },
            ].map((setting) => (
              <div key={setting.label} className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{setting.label}</Label>
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                </div>
                <Switch defaultChecked={setting.enabled} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
