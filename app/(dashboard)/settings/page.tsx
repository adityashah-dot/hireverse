"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Building2, Bell, Shield, UsersIcon, Trash2, Save, Mail, Copy, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/page-header"
import { useToast } from "@/hooks/use-toast"
import { settingsApi } from "@/lib/api"

export default function SettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [settings, setSettings] = useState({
    companyName: "",
    companyEmail: "",
    companyWebsite: "",
    companyIndustry: "",
    companySize: "",
    defaultAssessmentDuration: 60,
    passingScore: 70,
    assessmentLinkExpiryDays: 7,
    notifyOnNewApplication: true,
    notifyOnAssessmentComplete: true,
    weeklyReportEnabled: false,
    senderName: "",
    replyToEmail: "",
    emailNotifications: true,
    candidateUpdates: true,
    assessmentReminders: true,
    weeklyReports: false,
    twoFactorAuth: false,
    sessionTimeout: "60",
  })

  useEffect(() => {
    settingsApi.get().then((res) => {
      const company = res.data
      const s = company?.settings
      setSettings({
        companyName: company?.name || "",
        companyEmail: company?.email || "",
        companyWebsite: company?.website || "",
        companyIndustry: company?.industry || "",
        companySize: company?.size || "",
        defaultAssessmentDuration: s?.defaultAssessmentDuration ?? 60,
        passingScore: s?.passingScore ?? 70,
        assessmentLinkExpiryDays: s?.assessmentLinkExpiryDays ?? 7,
        notifyOnNewApplication: s?.notifyOnNewApplication ?? true,
        notifyOnAssessmentComplete: s?.notifyOnAssessmentComplete ?? true,
        weeklyReportEnabled: s?.weeklyReportEnabled ?? false,
        senderName: s?.senderName || "",
        replyToEmail: s?.replyToEmail || "",
        emailNotifications: s?.notifyOnNewApplication ?? true,
        candidateUpdates: s?.notifyOnNewApplication ?? true,
        assessmentReminders: s?.notifyOnAssessmentComplete ?? true,
        weeklyReports: s?.weeklyReportEnabled ?? false,
        twoFactorAuth: false,
        sessionTimeout: "60",
      })
      setTeamMembers(company?.users || [])
    }).catch(() => {}).finally(() => setIsLoading(false))
  }, [])

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Missing fields", description: "Please fill in all password fields", variant: "destructive" })
      return
    }
    if (newPassword.length < 8) {
      toast({ title: "Weak password", description: "New password must be at least 8 characters", variant: "destructive" })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Mismatch", description: "New passwords do not match", variant: "destructive" })
      return
    }
    setIsChangingPassword(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to change password")
      toast({ title: "Password changed", description: "Your password has been updated successfully" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await settingsApi.update({
        companyName: settings.companyName,
        companyWebsite: settings.companyWebsite,
        companyIndustry: settings.companyIndustry,
        companySize: settings.companySize,
        defaultAssessmentDuration: settings.defaultAssessmentDuration,
        passingScore: settings.passingScore,
        assessmentLinkExpiryDays: settings.assessmentLinkExpiryDays,
        notifyOnNewApplication: settings.notifyOnNewApplication,
        notifyOnAssessmentComplete: settings.notifyOnAssessmentComplete,
        weeklyReportEnabled: settings.weeklyReportEnabled,
        senderName: settings.senderName,
        replyToEmail: settings.replyToEmail,
      })
      toast({ title: "Settings saved", description: "Your changes have been saved successfully" })
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage your account and application preferences" />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <UsersIcon className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Mail className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Update your company details and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">Company Website</Label>
                  <Input
                    id="companyWebsite"
                    type="url"
                    value={settings.companyWebsite}
                    onChange={(e) => setSettings({ ...settings, companyWebsite: e.target.value })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Company Logo</Label>
                    <p className="text-sm text-muted-foreground">Upload your company logo (max 2MB)</p>
                  </div>
                  <Button variant="outline">Upload Logo</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle>Assessment Configuration</CardTitle>
                <CardDescription>Configure default assessment settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="assessmentDuration">Default Assessment Duration (minutes)</Label>
                  <Input id="assessmentDuration" type="number" defaultValue="60" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passingScore">Minimum Passing Score (%)</Label>
                  <Input id="passingScore" type="number" defaultValue="70" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assessmentExpiry">Assessment Link Expiry (days)</Label>
                  <Input id="assessmentExpiry" type="number" defaultValue="7" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="flex justify-end">
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>All Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive all email notifications</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Candidate Updates</Label>
                    <p className="text-sm text-muted-foreground">Notify when candidates move through stages</p>
                  </div>
                  <Switch
                    checked={settings.candidateUpdates}
                    onCheckedChange={(checked) => setSettings({ ...settings, candidateUpdates: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Assessment Reminders</Label>
                    <p className="text-sm text-muted-foreground">Remind candidates about pending assessments</p>
                  </div>
                  <Switch
                    checked={settings.assessmentReminders}
                    onCheckedChange={(checked) => setSettings({ ...settings, assessmentReminders: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">Receive weekly hiring analytics reports</p>
                  </div>
                  <Switch
                    checked={settings.weeklyReports}
                    onCheckedChange={(checked) => setSettings({ ...settings, weeklyReports: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="flex justify-end">
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Password & Authentication</CardTitle>
                <CardDescription>Manage your password and security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <Button onClick={handlePasswordChange} disabled={isChangingPassword}>
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </Button>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch
                    checked={settings.twoFactorAuth}
                    onCheckedChange={(checked) => setSettings({ ...settings, twoFactorAuth: checked })}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Select
                    value={settings.sessionTimeout}
                    onValueChange={(value) => setSettings({ ...settings, sessionTimeout: value })}
                  >
                    <SelectTrigger id="sessionTimeout">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions that affect your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Delete Account</p>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" onClick={() => toast({ title: "Contact admin", description: "Please contact your company administrator to delete this account.", variant: "destructive" })}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="flex justify-end">
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* Team Settings */}
        <TabsContent value="team" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage who has access to your workspace</CardDescription>
                  </div>
                  <Button>
                    <UsersIcon className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {member.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Select defaultValue={member.role.toLowerCase()}>
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="recruiter">Recruiter</SelectItem>
                            <SelectItem value="hiring manager">Hiring Manager</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Configure what each role can access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 pb-2 border-b border-border">
                    <div className="font-medium text-sm">Permission</div>
                    <div className="text-center text-sm font-medium">Admin</div>
                    <div className="text-center text-sm font-medium">Recruiter</div>
                    <div className="text-center text-sm font-medium">Manager</div>
                  </div>
                  {[
                    { name: "View candidates", admin: true, recruiter: true, manager: true },
                    { name: "Edit candidates", admin: true, recruiter: true, manager: false },
                    { name: "Schedule assessments", admin: true, recruiter: true, manager: true },
                    { name: "View reports", admin: true, recruiter: true, manager: true },
                    { name: "Manage team", admin: true, recruiter: false, manager: false },
                    { name: "Change settings", admin: true, recruiter: false, manager: false },
                  ].map((permission, index) => (
                    <motion.div
                      key={permission.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="grid grid-cols-4 gap-4 py-3"
                    >
                      <div className="text-sm text-foreground">{permission.name}</div>
                      <div className="flex justify-center">
                        <Switch checked={permission.admin} disabled />
                      </div>
                      <div className="flex justify-center">
                        <Switch checked={permission.recruiter} />
                      </div>
                      <div className="flex justify-center">
                        <Switch checked={permission.manager} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="flex justify-end">
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* Email Templates Settings */}
        <TabsContent value="templates" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Templates</CardTitle>
                    <CardDescription>Manage email templates for candidate communication</CardDescription>
                  </div>
                  <Button>
                    <Mail className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Interview Invitation", category: "Interview", usageCount: 45 },
                    { name: "Assessment Link", category: "Assessment", usageCount: 38 },
                    { name: "Offer Letter", category: "Offer", usageCount: 12 },
                    { name: "Application Received", category: "Application", usageCount: 156 },
                    { name: "Rejection - Polite", category: "Rejection", usageCount: 28 },
                  ].map((template, index) => (
                    <motion.div
                      key={template.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{template.name}</p>
                          <p className="text-sm text-muted-foreground">{template.category} • Used {template.usageCount} times</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>Configure email delivery preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="senderName">Sender Name</Label>
                  <Input id="senderName" defaultValue="TechCorp Hiring Team" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="replyTo">Reply-To Email</Label>
                  <Input id="replyTo" type="email" defaultValue="hr@techcorp.com" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Company Logo</Label>
                    <p className="text-sm text-muted-foreground">Add your logo to email headers</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Tracking</Label>
                    <p className="text-sm text-muted-foreground">Track when candidates open emails</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="flex justify-end">
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
