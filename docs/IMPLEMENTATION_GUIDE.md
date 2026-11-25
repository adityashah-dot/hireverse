# 🛠️ HireVerse Implementation Guide

## Developer Q&A for Building the Project

**This is a working reference for you (developer) and the AI coding agent to build HireVerse correctly.**

---

## 📋 Quick Reference

### Project Structure
```
hireverse/
├── app/
│   ├── (dashboard)/          # Protected recruiter routes
│   │   ├── jobs/
│   │   ├── candidates/
│   │   ├── assessments/
│   │   └── settings/
│   ├── (public)/              # Public routes
│   │   └── apply/[code]/      # Job application page
│   ├── (assessment)/          # Assessment taking
│   │   └── assessment/[token]/
│   ├── api/                   # API routes
│   │   ├── auth/
│   │   ├── jobs/
│   │   ├── candidates/
│   │   ├── assessments/
│   │   └── public/
│   └── page.tsx               # Landing page
├── components/
├── lib/
│   ├── prisma.ts              # Database client
│   ├── auth.ts                # Auth utilities
│   ├── ai/                    # AI services
│   └── email/                 # Email templates
├── prisma/
│   └── schema.prisma
└── .env.local
```

---

## 🚀 PHASE 1: Setup & Foundation

### Q: How do I set up the project from scratch?

```bash
# 1. Create Next.js project
npx create-next-app@latest hireverse --typescript --tailwind --app --src-dir=false

# 2. Install core dependencies
npm install prisma @prisma/client
npm install next-auth @auth/prisma-adapter
npm install bcryptjs jsonwebtoken
npm install zod
npm install @tanstack/react-query

# 3. Install UI dependencies (already have these)
npm install framer-motion lucide-react
npm install @radix-ui/react-* (shadcn handles this)

# 4. Install AI dependencies
npm install openai

# 5. Install file handling
npm install @aws-sdk/client-s3 pdf-parse mammoth

# 6. Install email
npm install resend @react-email/components

# 7. Install background jobs
npm install bullmq ioredis

# 8. Initialize Prisma
npx prisma init
```

### Q: What environment variables do I need?

```env
# .env.local

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/hireverse"

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="sk-..."

# S3/R2 Storage
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_BUCKET=""
S3_REGION="auto"
S3_ENDPOINT=""  # For R2: https://xxx.r2.cloudflarestorage.com

# Email
RESEND_API_KEY="re_..."

# Redis (for BullMQ)
REDIS_URL="redis://localhost:6379"

# App
APP_URL="http://localhost:3000"
```

### Q: How do I set up the database?

```bash
# 1. Start PostgreSQL (Docker)
docker run --name hireverse-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=hireverse -p 5432:5432 -d postgres:16

# 2. Push schema to database
npx prisma db push

# 3. Generate Prisma client
npx prisma generate

# 4. Seed initial data
npx prisma db seed
```

---

## 🗄️ PHASE 2: Database Schema

### Q: What's the minimal schema to start with?

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== AUTH ====================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  role          Role      @default(RECRUITER)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  jobs          Job[]
  notes         Note[]
}

enum Role {
  ADMIN
  RECRUITER
  VIEWER
}

// ==================== JOBS ====================

model Job {
  id              String    @id @default(cuid())
  title           String
  slug            String    @unique
  applicationCode String    @unique @default(cuid())
  description     String    @db.Text
  requirements    String[]
  skills          String[]
  
  department      String
  location        String
  employmentType  String    @default("FULL_TIME")
  experienceLevel String    @default("MID")
  salaryMin       Int?
  salaryMax       Int?
  
  status          JobStatus @default(DRAFT)
  
  createdById     String
  createdBy       User      @relation(fields: [createdById], references: [id])
  
  candidates      Candidate[]
  questions       Question[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  publishedAt     DateTime?
  
  @@index([status])
  @@index([applicationCode])
}

enum JobStatus {
  DRAFT
  ACTIVE
  CLOSED
}

// ==================== CANDIDATES ====================

model Candidate {
  id              String    @id @default(cuid())
  email           String
  name            String
  phone           String?
  
  resumeUrl       String?
  resumeText      String?   @db.Text
  resumeParsed    Json?
  
  aiSummary       String?   @db.Text
  skillMatch      Int?
  matchingSkills  String[]
  missingSkills   String[]
  
  stage           Stage     @default(APPLIED)
  
  jobId           String
  job             Job       @relation(fields: [jobId], references: [id])
  
  assessments     Assessment[]
  notes           Note[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([email, jobId])
  @@index([jobId])
  @@index([stage])
}

enum Stage {
  APPLIED
  SCREENING
  SHORTLISTED
  ASSESSMENT_SENT
  ASSESSMENT_DONE
  INTERVIEW
  OFFER
  HIRED
  REJECTED
}

// ==================== ASSESSMENTS ====================

model Assessment {
  id              String    @id @default(cuid())
  sessionToken    String    @unique @default(cuid())
  
  candidateId     String
  candidate       Candidate @relation(fields: [candidateId], references: [id])
  
  questionIds     String[]
  duration        Int       @default(60)
  
  status          AssessmentStatus @default(PENDING)
  score           Int?
  topicScores     Json?
  
  expiresAt       DateTime
  startedAt       DateTime?
  completedAt     DateTime?
  
  fingerprint     String?
  tabSwitches     Int       @default(0)
  
  responses       Response[]
  
  createdAt       DateTime  @default(now())
  
  @@index([sessionToken])
  @@index([candidateId])
}

enum AssessmentStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  EXPIRED
}

model Question {
  id            String   @id @default(cuid())
  text          String   @db.Text
  options       String[]
  correctAnswer Int
  explanation   String?  @db.Text
  category      String
  difficulty    String   @default("MEDIUM")
  
  jobId         String?
  job           Job?     @relation(fields: [jobId], references: [id])
  
  responses     Response[]
  
  createdAt     DateTime @default(now())
  
  @@index([jobId])
  @@index([category])
}

model Response {
  id            String     @id @default(cuid())
  assessmentId  String
  assessment    Assessment @relation(fields: [assessmentId], references: [id])
  questionId    String
  question      Question   @relation(fields: [questionId], references: [id])
  
  answer        Int?
  isCorrect     Boolean?
  timeTaken     Int?
  
  @@unique([assessmentId, questionId])
}

// ==================== NOTES ====================

model Note {
  id          String    @id @default(cuid())
  content     String    @db.Text
  
  candidateId String
  candidate   Candidate @relation(fields: [candidateId], references: [id])
  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  
  createdAt   DateTime  @default(now())
  
  @@index([candidateId])
}
```

### Q: How do I create the Prisma client singleton?

```typescript
// lib/prisma.ts

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 🔐 PHASE 3: Authentication

### Q: How do I implement auth with NextAuth?

```typescript
// app/api/auth/[...nextauth]/route.ts

import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          throw new Error('User not found')
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValid) {
          throw new Error('Invalid password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
})

export { handler as GET, handler as POST }
```

### Q: How do I create a register endpoint?

```typescript
// app/api/auth/register/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name } = registerSchema.parse(body)

    // Check if user exists
    const exists = await prisma.user.findUnique({
      where: { email }
    })

    if (exists) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Q: How do I protect API routes?

```typescript
// lib/auth.ts

import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function getSession() {
  return await getServerSession()
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.user?.id) return null
  
  return prisma.user.findUnique({
    where: { id: session.user.id }
  })
}

// Middleware helper for API routes
export function withAuth(handler: Function) {
  return async (req: NextRequest, context: any) => {
    const session = await getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    return handler(req, context, session.user)
  }
}
```

---

## 💼 PHASE 4: Jobs API

### Q: How do I create the Jobs CRUD API?

```typescript
// app/api/jobs/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

// GET /api/jobs - List all jobs
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where = status ? { status: status as any } : {}

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        _count: { select: { candidates: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.job.count({ where })
  ])

  return NextResponse.json({
    data: jobs,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
  })
}

// POST /api/jobs - Create a job
const createJobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(50),
  department: z.string(),
  location: z.string(),
  requirements: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  employmentType: z.string().optional(),
  experienceLevel: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = createJobSchema.parse(body)

    // Generate slug from title
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36)

    const job = await prisma.job.create({
      data: {
        ...data,
        slug,
        requirements: data.requirements || [],
        skills: data.skills || [],
        createdById: user.id,
      }
    })

    return NextResponse.json({ 
      data: job,
      applyLink: `${process.env.APP_URL}/apply/${job.applicationCode}`
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    throw error
  }
}
```

```typescript
// app/api/jobs/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/jobs/:id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { candidates: true } },
      candidates: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          stage: true,
          skillMatch: true,
          createdAt: true,
        }
      }
    }
  })

  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ data: job })
}

// PUT /api/jobs/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const job = await prisma.job.update({
    where: { id: params.id },
    data: body,
  })

  return NextResponse.json({ data: job })
}

// DELETE /api/jobs/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.job.update({
    where: { id: params.id },
    data: { status: 'CLOSED' },
  })

  return NextResponse.json({ success: true })
}
```

### Q: How do I implement publish/close endpoints?

```typescript
// app/api/jobs/[id]/publish/route.ts

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const job = await prisma.job.update({
    where: { id: params.id },
    data: {
      status: 'ACTIVE',
      publishedAt: new Date(),
    },
  })

  return NextResponse.json({
    data: job,
    applyLink: `${process.env.APP_URL}/apply/${job.applicationCode}`
  })
}
```

---

## 🌐 PHASE 5: Public Apply Flow

### Q: How do I create the public job apply page?

```typescript
// app/(public)/apply/[code]/page.tsx

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ApplyForm } from './apply-form'

export default async function ApplyPage({
  params,
}: {
  params: { code: string }
}) {
  const job = await prisma.job.findUnique({
    where: { 
      applicationCode: params.code,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      title: true,
      description: true,
      requirements: true,
      skills: true,
      department: true,
      location: true,
      employmentType: true,
    }
  })

  if (!job) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-3xl">
        <h1 className="text-3xl font-bold">{job.title}</h1>
        <p className="text-muted-foreground mt-2">
          {job.department} • {job.location}
        </p>
        
        <div className="mt-8 prose prose-sm">
          <h2>About the Role</h2>
          <p>{job.description}</p>
          
          <h2>Requirements</h2>
          <ul>
            {job.requirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Apply Now</h2>
          <ApplyForm jobId={job.id} />
        </div>
      </div>
    </div>
  )
}
```

```typescript
// app/(public)/apply/[code]/apply-form.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

export function ApplyForm({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/public/apply', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Failed to submit')

      setSuccess(true)
    } catch (error) {
      alert('Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-green-600">
          Application Submitted!
        </h3>
        <p className="text-muted-foreground mt-2">
          We'll be in touch soon.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />
      
      <div>
        <Label htmlFor="name">Full Name *</Label>
        <Input id="name" name="name" required />
      </div>

      <div>
        <Label htmlFor="email">Email *</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" />
      </div>

      <div>
        <Label htmlFor="resume">Resume (PDF/DOC) *</Label>
        <Input 
          id="resume" 
          name="resume" 
          type="file" 
          accept=".pdf,.doc,.docx"
          required 
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Submitting...' : 'Submit Application'}
      </Button>
    </form>
  )
}
```

### Q: How do I handle the application submission API?

```typescript
// app/api/public/apply/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadToS3 } from '@/lib/storage'
import { queueResumeProcessing } from '@/lib/queue'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    
    const jobId = formData.get('jobId') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string | null
    const resumeFile = formData.get('resume') as File

    // Validate job exists and is active
    const job = await prisma.job.findUnique({
      where: { id: jobId, status: 'ACTIVE' }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or not accepting applications' },
        { status: 404 }
      )
    }

    // Check for duplicate application
    const existing = await prisma.candidate.findUnique({
      where: { email_jobId: { email, jobId } }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You have already applied for this position' },
        { status: 400 }
      )
    }

    // Upload resume to S3
    const resumeBuffer = Buffer.from(await resumeFile.arrayBuffer())
    const resumeUrl = await uploadToS3(
      resumeBuffer,
      `resumes/${jobId}/${Date.now()}-${resumeFile.name}`
    )

    // Create candidate
    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        phone,
        resumeUrl,
        jobId,
        stage: 'APPLIED',
      }
    })

    // Queue background processing (resume parsing + matching)
    await queueResumeProcessing(candidate.id)

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully'
    })

  } catch (error) {
    console.error('Application error:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}
```

---

## 🤖 PHASE 6: AI Processing

### Q: How do I implement resume parsing?

```typescript
// lib/ai/parse-resume.ts

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function parseResume(resumeText: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are a resume parser. Extract structured information from resumes.
Return valid JSON only. No markdown, no explanation.`
      },
      {
        role: 'user',
        content: `Parse this resume into JSON with these fields:
- name (string)
- email (string)
- phone (string or null)
- summary (string, 2-3 sentences about the candidate)
- skills (array of strings)
- experience (array of {company, title, duration, description})
- education (array of {institution, degree, field, year})
- totalYearsExperience (number)

Resume:
${resumeText}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  return JSON.parse(response.choices[0].message.content!)
}
```

### Q: How do I implement skill matching?

```typescript
// lib/ai/match-skills.ts

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function matchSkills(
  candidateSkills: string[],
  jobSkills: string[],
  resumeText: string
) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an expert recruiter evaluating candidate fit.'
      },
      {
        role: 'user',
        content: `Compare this candidate to the job requirements.

Job requires these skills: ${jobSkills.join(', ')}

Candidate has these skills: ${candidateSkills.join(', ')}

Candidate resume excerpt:
${resumeText.slice(0, 2000)}

Return JSON with:
- score (0-100, how well they match)
- matchingSkills (array of skills they have)
- missingSkills (array of skills they lack)
- summary (2-3 sentence assessment)`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  return JSON.parse(response.choices[0].message.content!)
}
```

### Q: How do I process resumes in the background?

```typescript
// lib/ai/process-resume.ts

import { prisma } from '@/lib/prisma'
import { extractTextFromFile } from '@/lib/file-utils'
import { parseResume } from '@/lib/ai/parse-resume'
import { matchSkills } from '@/lib/ai/match-skills'

export async function processResume(candidateId: string) {
  // 1. Get candidate and job
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { job: true }
  })

  if (!candidate || !candidate.resumeUrl) {
    throw new Error('Candidate or resume not found')
  }

  // 2. Extract text from resume file
  const resumeText = await extractTextFromFile(candidate.resumeUrl)

  // 3. Parse resume with AI
  const parsed = await parseResume(resumeText)

  // 4. Match skills with job
  const match = await matchSkills(
    parsed.skills,
    candidate.job.skills,
    resumeText
  )

  // 5. Update candidate with AI data
  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      resumeText,
      resumeParsed: parsed,
      aiSummary: match.summary,
      skillMatch: match.score,
      matchingSkills: match.matchingSkills,
      missingSkills: match.missingSkills,
      // Auto-shortlist if score is high
      stage: match.score >= 70 ? 'SHORTLISTED' : 'SCREENING',
    }
  })

  return { parsed, match }
}
```

---

## 📝 PHASE 7: Assessment System

### Q: How do I generate assessment questions?

```typescript
// lib/ai/generate-questions.ts

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateQuestions(
  role: string,
  skills: string[],
  level: string,
  count: number = 20
) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an expert technical interviewer.'
      },
      {
        role: 'user',
        content: `Generate ${count} MCQ questions for a ${level} ${role}.

Skills to assess: ${skills.join(', ')}

Requirements:
- 40% easy, 40% medium, 20% hard
- Each question has exactly 4 options
- Only ONE correct answer (index 0-3)
- Include scenario-based questions
- Add explanation for correct answer

Return JSON array:
[{
  "text": "Question?",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": 0,
  "explanation": "Why A is correct",
  "category": "React",
  "difficulty": "MEDIUM"
}]`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const result = JSON.parse(response.choices[0].message.content!)
  return result.questions || result
}
```

### Q: How do I send an assessment?

```typescript
// app/api/assessments/send/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateQuestions } from '@/lib/ai/generate-questions'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { candidateId, duration = 60 } = await req.json()

  // Get candidate and job
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { job: true }
  })

  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }

  // Generate questions
  const questions = await generateQuestions(
    candidate.job.title,
    candidate.job.skills,
    candidate.job.experienceLevel,
    20
  )

  // Save questions
  const savedQuestions = await prisma.question.createMany({
    data: questions.map((q: any) => ({
      ...q,
      jobId: candidate.jobId,
    }))
  })

  // Get question IDs
  const questionRecords = await prisma.question.findMany({
    where: { jobId: candidate.jobId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Create assessment
  const assessment = await prisma.assessment.create({
    data: {
      candidateId,
      questionIds: questionRecords.map(q => q.id),
      duration,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    }
  })

  // Update candidate stage
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { stage: 'ASSESSMENT_SENT' }
  })

  // Send email
  const assessmentLink = `${process.env.APP_URL}/assessment/${assessment.sessionToken}`
  
  await sendEmail({
    to: candidate.email,
    subject: `Assessment for ${candidate.job.title}`,
    html: `
      <h1>Hi ${candidate.name},</h1>
      <p>You've been invited to take an assessment for ${candidate.job.title}.</p>
      <p><strong>Duration:</strong> ${duration} minutes</p>
      <p><strong>Expires:</strong> 24 hours</p>
      <a href="${assessmentLink}">Start Assessment</a>
    `
  })

  return NextResponse.json({
    success: true,
    assessmentId: assessment.id,
    link: assessmentLink,
  })
}
```

### Q: How do I implement the assessment taking page?

```typescript
// app/(assessment)/assessment/[token]/page.tsx

import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { AssessmentClient } from './assessment-client'

export default async function AssessmentPage({
  params,
}: {
  params: { token: string }
}) {
  const assessment = await prisma.assessment.findUnique({
    where: { sessionToken: params.token },
    include: {
      candidate: { select: { name: true } },
    }
  })

  if (!assessment) {
    notFound()
  }

  if (assessment.status === 'COMPLETED') {
    redirect('/assessment/complete')
  }

  if (assessment.expiresAt < new Date()) {
    redirect('/assessment/expired')
  }

  // Get questions WITHOUT correct answers
  const questions = await prisma.question.findMany({
    where: { id: { in: assessment.questionIds } },
    select: {
      id: true,
      text: true,
      options: true,
      category: true,
      difficulty: true,
      // NO correctAnswer!
    }
  })

  return (
    <AssessmentClient
      assessment={{
        id: assessment.id,
        token: assessment.sessionToken,
        duration: assessment.duration,
        candidateName: assessment.candidate.name,
        status: assessment.status,
        startedAt: assessment.startedAt?.toISOString() || null,
      }}
      questions={questions}
    />
  )
}
```

### Q: How do I handle assessment submission?

```typescript
// app/api/assessments/[token]/submit/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { answers } = await req.json()
  // answers: [{ questionId, answer }]

  const assessment = await prisma.assessment.findUnique({
    where: { sessionToken: params.token },
    include: { candidate: true }
  })

  if (!assessment || assessment.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Invalid assessment' }, { status: 400 })
  }

  // Get correct answers
  const questions = await prisma.question.findMany({
    where: { id: { in: assessment.questionIds } }
  })
  const questionMap = new Map(questions.map(q => [q.id, q]))

  // Score
  let correct = 0
  const topicScores: Record<string, { correct: number; total: number }> = {}

  for (const ans of answers) {
    const q = questionMap.get(ans.questionId)
    if (!q) continue

    const isCorrect = ans.answer === q.correctAnswer
    if (isCorrect) correct++

    // Track by topic
    if (!topicScores[q.category]) {
      topicScores[q.category] = { correct: 0, total: 0 }
    }
    topicScores[q.category].total++
    if (isCorrect) topicScores[q.category].correct++

    // Save response
    await prisma.response.create({
      data: {
        assessmentId: assessment.id,
        questionId: ans.questionId,
        answer: ans.answer,
        isCorrect,
      }
    })
  }

  const score = Math.round((correct / answers.length) * 100)
  const topicPercentages: Record<string, number> = {}
  for (const [topic, data] of Object.entries(topicScores)) {
    topicPercentages[topic] = Math.round((data.correct / data.total) * 100)
  }

  // Update assessment
  await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      status: 'COMPLETED',
      score,
      topicScores: topicPercentages,
      completedAt: new Date(),
    }
  })

  // Update candidate
  await prisma.candidate.update({
    where: { id: assessment.candidateId },
    data: { stage: 'ASSESSMENT_DONE' }
  })

  return NextResponse.json({
    score,
    passed: score >= 70,
  })
}
```

---

## 📁 PHASE 8: File Storage

### Q: How do I upload files to S3/R2?

```typescript
// lib/storage.ts

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
})

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType = 'application/octet-stream'
): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))

  return key
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  })
  
  return getSignedUrl(s3, command, { expiresIn: 3600 })
}
```

### Q: How do I extract text from PDF/DOC?

```typescript
// lib/file-utils.ts

import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import { getFileFromS3 } from './storage'

export async function extractTextFromFile(fileKey: string): Promise<string> {
  const buffer = await getFileFromS3(fileKey)
  const ext = fileKey.split('.').pop()?.toLowerCase()

  if (ext === 'pdf') {
    const data = await pdfParse(buffer)
    return data.text
  }

  if (ext === 'doc' || ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error(`Unsupported file type: ${ext}`)
}
```

---

## 📧 PHASE 9: Email

### Q: How do I send emails with Resend?

```typescript
// lib/email.ts

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: 'HireVerse <noreply@yourdomain.com>',
    to,
    subject,
    html,
  })

  if (error) {
    console.error('Email error:', error)
    throw error
  }

  return data
}
```

---

## ✅ Quick Checklist

### MVP Features Checklist
- [ ] Auth (register, login, logout)
- [ ] Jobs CRUD
- [ ] Job publish + apply link
- [ ] Public apply page
- [ ] Resume upload to S3
- [ ] Candidate list + detail
- [ ] AI resume parsing
- [ ] AI skill matching
- [ ] Assessment generation
- [ ] Assessment delivery
- [ ] Assessment submission + scoring
- [ ] Email notifications

### Commands Reference
```bash
# Development
npm run dev

# Database
npx prisma db push      # Apply schema
npx prisma generate     # Generate client
npx prisma studio       # Open database GUI
npx prisma db seed      # Seed data

# Build
npm run build
npm run start
```

---

*Use this guide as your reference while building. Each section answers "How do I...?" for that feature.*
