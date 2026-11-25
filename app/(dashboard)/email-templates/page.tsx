"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Eye, Code, Copy, CheckCircle2, Plus, Edit, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
  category: string
  usageCount?: number
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "default-1",
    name: "Interview Invitation",
    subject: "Interview Invitation for {{jobTitle}} at {{companyName}}",
    body: `Hi {{candidateName}},\n\nWe're excited to invite you for an interview for the {{jobTitle}} position at {{companyName}}.\n\nInterview Details:\n- Date: {{interviewDate}}\n- Time: {{interviewTime}}\n- Duration: {{duration}} minutes\n- Format: {{format}}\n\nMeeting Link: {{meetingLink}}\n\nPlease confirm your availability.\n\nBest regards,\n{{recruiterName}}`,
    variables: ["candidateName","jobTitle","companyName","interviewDate","interviewTime","duration","format","meetingLink","recruiterName"],
    category: "Interview",
  },
  {
    id: "default-2",
    name: "Assessment Link",
    subject: "Complete Your Assessment for {{jobTitle}}",
    body: `Hi {{candidateName}},\n\nThank you for your interest in the {{jobTitle}} position. Please complete the assessment below.\n\nAssessment Link: {{assessmentLink}}\nDuration: {{duration}} minutes\nExpires: {{expiryDate}}\n\nGood luck!\n{{recruiterName}}`,
    variables: ["candidateName","jobTitle","assessmentLink","duration","expiryDate","recruiterName"],
    category: "Assessment",
  },
]

export default function EmailTemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(DEFAULT_TEMPLATES[0])
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit")
  const [copied, setCopied] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [newName, setNewName] = useState("")
  const [newSubject, setNewSubject] = useState("")
  const [newBody, setNewBody] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetch("/api/email-templates")
      .then((r) => r.json())
      .then((res) => {
        const fetched: EmailTemplate[] = res.data || []
        if (fetched.length > 0) {
          setTemplates([...DEFAULT_TEMPLATES, ...fetched])
          setSelectedTemplate(fetched[0])
        }
      })
      .catch(() => {})
  }, [])

  const openCreate = () => {
    setIsEditMode(false)
    setNewName(""); setNewSubject(""); setNewBody(""); setNewCategory("")
    setIsDialogOpen(true)
  }

  const openEdit = () => {
    setIsEditMode(true)
    setNewName(selectedTemplate.name)
    setNewSubject(selectedTemplate.subject)
    setNewBody(selectedTemplate.body)
    setNewCategory(selectedTemplate.category)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!newName || !newSubject || !newBody) return
    setIsSaving(true)
    try {
      if (isEditMode && !selectedTemplate.id.startsWith("default-")) {
        const res = await fetch(`/api/email-templates/${selectedTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName, subject: newSubject, body: newBody, category: newCategory }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setTemplates((prev) => prev.map((t) => t.id === selectedTemplate.id ? data.data : t))
        setSelectedTemplate(data.data)
        toast({ title: "Template updated" })
      } else {
        const res = await fetch("/api/email-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName, subject: newSubject, body: newBody, category: newCategory }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setTemplates((prev) => [...prev, data.data])
        setSelectedTemplate(data.data)
        toast({ title: "Template created" })
      }
      setIsDialogOpen(false)
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (selectedTemplate.id.startsWith("default-")) {
      toast({ title: "Cannot delete default template", variant: "destructive" })
      return
    }
    try {
      await fetch(`/api/email-templates/${selectedTemplate.id}`, { method: "DELETE" })
      const remaining = templates.filter((t) => t.id !== selectedTemplate.id)
      setTemplates(remaining)
      setSelectedTemplate(remaining[0] || DEFAULT_TEMPLATES[0])
      toast({ title: "Template deleted" })
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" })
    }
  }

  const copyTemplate = () => {
    navigator.clipboard.writeText(selectedTemplate.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderPreview = () => {
    let preview = selectedTemplate.body
    ;(selectedTemplate.variables || []).forEach((variable) => {
      preview = preview.replace(
        new RegExp(`{{${variable}}}`, "g"),
        `<span class="bg-emerald-500/20 text-emerald-600 px-1 rounded">${variable}</span>`,
      )
    })
    return preview
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Email Templates"
        description="Manage and customize your email templates"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Templates List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Templates</CardTitle>
            <CardDescription>Click to preview and edit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {templates.map((template, index) => (
                <motion.button
                  key={template.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedTemplate.id === template.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-sm">{template.name}</p>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        selectedTemplate.id === template.id ? "bg-primary-foreground/20 text-primary-foreground" : ""
                      }`}
                    >
                      {template.usageCount}
                    </Badge>
                  </div>
                  <p
                    className={`text-xs ${
                      selectedTemplate.id === template.id ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {template.category}
                  </p>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Template Editor */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{selectedTemplate.name}</CardTitle>
                <CardDescription>{selectedTemplate.category} Template</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyTemplate}>
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "edit" | "preview")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="edit" className="gap-2">
                  <Code className="h-4 w-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Subject</Label>
                  <Input value={selectedTemplate.subject} className="mt-1.5 font-mono text-sm" readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium">Body</Label>
                  <Textarea value={selectedTemplate.body} className="mt-1.5 min-h-[300px] font-mono text-sm" readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Available Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map((variable) => (
                      <Badge
                        key={variable}
                        variant="secondary"
                        className="font-mono text-xs cursor-pointer hover:bg-primary/20"
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${variable}}}`)
                        }}
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <div className="p-6 bg-muted rounded-lg border-2 border-border">
                  <div className="bg-background rounded-lg shadow-lg max-w-2xl mx-auto">
                    <div className="p-6 border-b border-border">
                      <p className="text-sm text-muted-foreground">Subject</p>
                      <p
                        className="font-medium mt-1"
                        dangerouslySetInnerHTML={{
                          __html: selectedTemplate.subject.replace(
                            /{{(.*?)}}/g,
                            '<span class="bg-emerald-500/20 text-emerald-600 px-1 rounded">$1</span>',
                          ),
                        }}
                      />
                    </div>
                    <div className="p-6">
                      <pre
                        className="whitespace-pre-wrap font-sans text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: renderPreview() }}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Template" : "Create Email Template"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update the template details below." : "Create a new email template with dynamic variables like {{candidateName}}."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Template Name</Label>
              <Input
                placeholder="Interview Invitation"
                className="mt-1.5"
                value={newName}
                onChange={(e) => setNewName((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                placeholder="Interview / Assessment / Offer"
                className="mt-1.5"
                value={newCategory}
                onChange={(e) => setNewCategory((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <Label>Subject Line</Label>
              <Input
                placeholder="Use {{variables}} for dynamic content"
                className="mt-1.5"
                value={newSubject}
                onChange={(e) => setNewSubject((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <Label>Email Body</Label>
              <Textarea
                placeholder="Write your template here. Use {{candidateName}}, {{jobTitle}}, etc."
                className="mt-1.5 min-h-[200px]"
                value={newBody}
                onChange={(e) => setNewBody((e.target as HTMLTextAreaElement).value)}
              />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={isSaving || !newName || !newSubject || !newBody}>
              {isSaving ? "Saving..." : isEditMode ? "Update Template" : "Create Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
