"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Plus, Video, Users, Clock, MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/page-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { interviewsApi, candidatesApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface CalendarEvent {
  id: string
  title: string
  type: "interview" | "assessment" | "meeting" | "review"
  time: string
  duration: number
  candidate?: string
  job?: string
  attendees?: string[]
  location?: string
}


const typeColors = {
  interview: "bg-purple-500",
  assessment: "bg-amber-500",
  meeting: "bg-blue-500",
  review: "bg-emerald-500",
}

const typeLabels = {
  interview: "Interview",
  assessment: "Assessment",
  meeting: "Meeting",
  review: "Review",
}

export default function CalendarPage() {
  const { toast } = useToast()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [allInterviews, setAllInterviews] = useState<any[]>([])
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [newEvent, setNewEvent] = useState({ type: "", title: "", date: "", time: "", duration: "60", notes: "", candidateId: "" })
  const [candidates, setCandidates] = useState<any[]>([])
  const [isScheduling, setIsScheduling] = useState(false)

  useEffect(() => {
    interviewsApi.list().then((res) => setAllInterviews(res.data || [])).catch(() => {})
    candidatesApi.list().then((res) => setCandidates(res.data || [])).catch(() => {})
  }, [])

  const handleScheduleEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time || !newEvent.candidateId) {
      toast({ title: "Missing fields", description: "Please fill in title, candidate, date, and time", variant: "destructive" })
      return
    }
    setIsScheduling(true)
    try {
      const candidate = candidates.find((c: any) => c.id === newEvent.candidateId)
      const scheduledAt = new Date(`${newEvent.date}T${newEvent.time}`).toISOString()
      await interviewsApi.create({
        candidateId: newEvent.candidateId,
        jobId: candidate?.jobId || candidate?.job?.id,
        title: newEvent.title,
        type: (newEvent.type || "VIDEO").toUpperCase(),
        scheduledAt,
        duration: parseInt(newEvent.duration) || 60,
        notes: newEvent.notes || undefined,
      })
      toast({ title: "Event scheduled", description: "Interview has been added to the calendar" })
      setAddEventOpen(false)
      setNewEvent({ type: "", title: "", date: "", time: "", duration: "60", notes: "", candidateId: "" })
      interviewsApi.list().then((res) => setAllInterviews(res.data || [])).catch(() => {})
    } catch (err: any) {
      toast({ title: "Failed", description: err.message || "Could not schedule event", variant: "destructive" })
    } finally {
      setIsScheduling(false)
    }
  }

  const events: Record<number, CalendarEvent[]> = {}
  allInterviews.forEach((interview) => {
    const d = interview.scheduledAt ? new Date(interview.scheduledAt) : null
    if (!d) return
    if (d.getFullYear() !== currentMonth.getFullYear() || d.getMonth() !== currentMonth.getMonth()) return
    const day = d.getDate()
    if (!events[day]) events[day] = []
    events[day].push({
      id: interview.id,
      title: interview.title || `${interview.type} Interview`,
      type: "interview",
      time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      duration: interview.duration || 60,
      candidate: interview.candidate?.name,
      job: interview.candidate?.job?.title,
      location: interview.location || interview.meetingLink,
    })
  })

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    setSelectedDay(null)
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    setSelectedDay(null)
  }

  const getDayEvents = (day: number) => events[day] || []
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === currentMonth.getFullYear() && today.getMonth() === currentMonth.getMonth()
  const todayDay = isCurrentMonth ? today.getDate() : -1

  const totalEvents = Object.values(events).flat().length
  const interviewCount = Object.values(events).flat().filter((e) => e.type === "interview").length
  const assessmentCount = Object.values(events).flat().filter((e) => e.type === "assessment").length

  return (
    <div className="space-y-8">
      <PageHeader
        title="Calendar"
        description="Manage your hiring schedule"
        actions={
          <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Event</DialogTitle>
                <DialogDescription>Add a new interview to the calendar</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Interview Type</Label>
                  <Select value={newEvent.type} onValueChange={(v) => setNewEvent({ ...newEvent, type: v })}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIDEO">Video</SelectItem>
                      <SelectItem value="PHONE_SCREEN">Phone Screen</SelectItem>
                      <SelectItem value="ONSITE">Onsite</SelectItem>
                      <SelectItem value="TECHNICAL">Technical</SelectItem>
                      <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
                      <SelectItem value="FINAL">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input placeholder="Event title" className="mt-1.5" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} />
                </div>
                <div>
                  <Label>Candidate</Label>
                  <Select value={newEvent.candidateId} onValueChange={(v) => setNewEvent({ ...newEvent, candidateId: v })}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name} — {c.job?.title || ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" className="mt-1.5" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input type="time" className="mt-1.5" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input type="number" placeholder="60" className="mt-1.5" value={newEvent.duration} onChange={(e) => setNewEvent({ ...newEvent, duration: e.target.value })} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea placeholder="Add any notes..." className="mt-1.5" value={newEvent.notes} onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })} />
                </div>
                <Button className="w-full" onClick={handleScheduleEvent} disabled={isScheduling}>
                  {isScheduling ? "Scheduling..." : "Schedule Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Events", value: totalEvents, color: "bg-blue-500" },
          { label: "Interviews", value: interviewCount, color: "bg-purple-500" },
          { label: "Assessments", value: assessmentCount, color: "bg-amber-500" },
          { label: "This Week", value: 5, color: "bg-emerald-500" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the first of the month */}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square p-1" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1
                const dayEvents = getDayEvents(day)
                const isSelected = selectedDay === day
                const isToday = day === todayDay

                return (
                  <motion.button
                    key={day}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDay(day)}
                    className={`aspect-square p-1 rounded-lg transition-all relative ${
                      isSelected
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : isToday
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                    }`}
                  >
                    <span className="text-sm font-medium">{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((event, i) => (
                          <div key={i} className={`h-1.5 w-1.5 rounded-full ${typeColors[event.type]}`} />
                        ))}
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border">
              {Object.entries(typeLabels).map(([type, label]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${typeColors[type as keyof typeof typeColors]}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Events */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDay ? `Events on ${monthNames[currentMonth.getMonth()]} ${selectedDay}` : "Select a Day"}
            </CardTitle>
            <CardDescription>
              {selectedDay ? `${getDayEvents(selectedDay).length} event(s)` : "Click on a day to view events"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDay ? (
              <div className="space-y-3">
                {getDayEvents(selectedDay).length > 0 ? (
                  getDayEvents(selectedDay).map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <Badge className={`${typeColors[event.type]} text-white border-0 text-[10px]`}>
                          {typeLabels[event.type]}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            {event.time} ({event.duration} min)
                          </span>
                        </div>
                        {event.candidate && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>{event.candidate}</span>
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex -space-x-1">
                              {event.attendees.slice(0, 3).map((attendee, i) => (
                                <Avatar key={i} className="h-5 w-5 border border-background">
                                  <AvatarFallback className="text-[8px] bg-primary/10">
                                    {attendee
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            <span className="text-[10px]">
                              {event.attendees.length > 3
                                ? `+${event.attendees.length - 3} more`
                                : event.attendees.join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                      {event.type === "interview" && event.location && (
                        <Button size="sm" className="w-full mt-3 h-7 text-xs" onClick={() => window.open(event.location!, "_blank")}>
                          <Video className="mr-1.5 h-3 w-3" />
                          Join Meeting
                        </Button>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No events scheduled</p>
                    <Button variant="outline" size="sm" className="mt-3 bg-transparent" onClick={() => setAddEventOpen(true)}>
                      <Plus className="mr-2 h-3 w-3" />
                      Add Event
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Select a day to view or add events</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Upcoming This Week</CardTitle>
          <CardDescription>Your scheduled events for the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(events)
              .slice(0, 6)
              .flatMap(([day, dayEvents]) =>
                dayEvents.map((event) => ({
                  ...event,
                  day: Number.parseInt(day),
                })),
              )
              .map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`h-2 w-2 rounded-full ${typeColors[event.type]} mt-1.5`} />
                    <Badge variant="outline" className="text-[10px]">
                      {monthNames[currentMonth.getMonth()].slice(0, 3)} {event.day}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-sm mb-1">{event.title}</h4>
                  <p className="text-xs text-muted-foreground">{event.time}</p>
                  {event.candidate && <p className="text-xs text-muted-foreground mt-1">with {event.candidate}</p>}
                </motion.div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Calendar(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}
