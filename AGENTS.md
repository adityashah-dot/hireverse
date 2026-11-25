# HireVerse — Developer Reference

An AI-powered Applicant Tracking System built with Next.js 16 App Router. Full pipeline: resume parsing → skill matching → MCQ assessments → AI voice interviews → offer management.

---

## Architecture Overview

| Layer | Tech | Role |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind 4, shadcn/ui (new-york style), Framer Motion | RSC pages + client interactivity |
| Backend API | Next.js Route Handlers (app/api) | REST endpoints, auth, business logic |
| Auth | NextAuth.js v4 (Credentials + JWT) | Session management, role-based access |
| Database | PostgreSQL via Supabase + Prisma ORM | All persistent data |
| AI — Resume & Skills | Groq Llama 3.3 70B (`lib/ai/parse-resume.ts`, `match-skills.ts`) | Resume extraction, semantic skill matching |
| AI — MCQ Questions | OpenAI GPT-4o-mini (`lib/ai/generate-questions.ts`) | Assessment question generation |
| AI — Voice Interview | Python FastAPI microservice (`ai-interview-service/`) | STT (Groq Whisper), answer eval (Groq LLM), YOLOv8 eye tracking |
| Background Jobs | BullMQ + Redis (Docker) | Resume processing, email sending, question generation |
| File Storage | AWS S3 / Cloudflare R2 + local fallback (`lib/storage.ts`) | Resume uploads, interview recordings |
| Email | Nodemailer (Gmail SMTP) or Resend (`lib/email.ts`) | Assessment invites, application confirmations |

---

## Project Structure

```
app/
  layout.tsx              # Root layout — Inter + Geist Mono fonts, ThemeProvider, SessionProvider, Vercel Analytics
  page.tsx                # Landing page (/) — animated hero, features, pricing, CTA sections
  error.tsx               # Global error boundary (client component)
  globals.css             # Tailwind + CSS variables (neutral base, dark mode)

  (auth)/                 # Public auth pages — no layout wrapper needed
    layout.tsx             # Minimal centered card layout
    sign-in/               # Credentials login (email + password via NextAuth)
    register/              # Company signup (name, email, password, company name)
    forgot-password/        # Email-based password reset request
    reset-password/         # Token-based password reset form

  (dashboard)/            # Authenticated recruiter pages — all wrapped in AppShell sidebar
    layout.tsx             # Wraps children in <AppShell> (sidebar + top navbar)

    dashboard/             # Analytics overview — stat cards, pipeline chart, recent activity, top jobs
      DashboardClient.tsx   # Client component with stat cards, charts, recent activity feed
      page.tsx              # Server component — fetches cached analytics via fetchDashboardAnalytics()

    jobs/                  # Job listing table (CRUD)
      [jobId]/              # Single job detail/edit page

    candidates/            # Candidate listing table with filters
      [candidateId]/        # Candidate detail — resume viewer, skill match, stage, notes, activity

    assessments/           # Assessment management
      [id]/                 # Assessment results — per-question breakdown

    pipeline/              # Kanban-style drag-and-drop pipeline view (APPLIED → HIRED)

    interviews/            # Interview scheduling + AI interview management

    settings/              # Company settings — assessment defaults, email config, notification prefs

    team/                  # Team member management — invite, role management, remove

    send-links/            # Bulk assessment link sending interface

    ai-insights/           # AI-generated candidate insights

    reports/               # Hiring reports and analytics

    bulk-actions/          # Bulk stage updates, bulk assessment sending

    calendar/              # Interview scheduling calendar

    notifications/         # Notification center

    email-templates/       # Email template management (create/edit)

  (assessment)/           # Candidate-facing pages — PUBLIC, no auth required
    layout.tsx             # Minimal layout, no sidebar
    assessment/[sessionId]/ # MCQ assessment UI — proctored test with timer, tab-switch detection
    ai-interview/[sessionId]/ # AI voice interview UI — camera + mic, eye tracking, TTS

  api/
    auth/[...nextauth]/    # NextAuth catch-all route
    auth/register/         # POST — company + user registration
    auth/me/               # GET — current session user

    jobs/                  # GET (list), POST (create)
      [id]/                # GET, PUT, DELETE single job
        publish/           # POST — set status to ACTIVE
        close/             # POST — set status to CLOSED

    candidates/            # GET (list by job/company), POST (create, file upload)
      [id]/                # GET, PUT single candidate
        resume/            # POST — upload resume file
        parse/             # POST — trigger resume parsing
        stage/             # PUT — update candidate stage
        notes/             # GET (list), POST (create) notes
        timeline/          # GET — activity log

    assessments/           # Assessment CRUD
      send/                # POST — create assessment + queue question generation + send email
      [token]/             # GET — fetch assessment by session token (public)
        start/             # POST — begin assessment (log start time)
        submit/            # POST — submit answers with tab-switch count
        event/             # POST — log proctoring events (tab switches, window blur)
      results/[id]/        # GET — assessment results with per-question breakdown

    questions/             # GET (list), POST (generate via AI)
      [id]/                # DELETE single question

    interviews/            # GET (list), POST (schedule)
      [id]/                # PUT, DELETE single interview
        feedback/          # POST — interviewer submits feedback

    ai-interview/
      complete/            # POST — webhook from Python service (interview results)
      pregenerate/         # POST — trigger question pre-generation for an interview link
      status/[id]/         # GET — current interview session status

    analytics/
      dashboard/           # GET — cached dashboard metrics (jobs, candidates, pipeline, activity)
      pipeline/            # GET — pipeline stage breakdown

    public/
      jobs/                # GET — public job listings (careers page)
        [slug]/            # GET — job detail by slug
      apply/               # POST — candidate applies (FormData with resume)

    activity/              # GET — recent activity log

    settings/              # GET, PUT — company settings

    team/                  # GET (list), POST (invite)
      [userId]/            # PUT (role), DELETE (remove)

    email-templates/       # GET (list), POST (create)

  apply/                   # Public job application page
    [slug]/                # Apply for a specific job

  careers/                 # Public careers page — list all active jobs
```

---

## Database Schema (19 models, 7 enums)

### Core Models

| Model | Fields | Indexes | Notes |
|---|---|---|---|
| **Company** | id, name, slug (unique), logo, website, industry, size | — | Multi-tenant root |
| **CompanySettings** | id, companyId (unique), defaultAssessmentDuration, passingScore, email config, notification flags | — | 1:1 with Company |
| **User** | id, email (unique), passwordHash, name, role, companyId | companyId, email | 5 roles: ADMIN, HIRING_MANAGER, RECRUITER, INTERVIEWER, VIEWER |
| **Job** | id, title, slug (unique), applicationCode (unique), description, skills[], requirements[], department, location, status, salary | companyId, status, applicationCode, createdAt | 5 statuses: DRAFT→ACTIVE→PAUSED/CLOSED/ARCHIVED |
| **Candidate** | id, email+jobId (unique), name, resumeUrl, resumeText, resumeParsed (JSON), aiSummary, skillMatch, matchingSkills[], missingSkills[], stage | jobId, stage, skillMatch, isArchived+createdAt | 9 stages: APPLIED→SCREENING→SHORTLISTED→ASSESSMENT_SENT→ASSESSMENT_DONE→INTERVIEW→OFFER→HIRED/REJECTED |
| **Education** | id, candidateId, institution, degree, field, gpa | candidateId | Populated by resume parsing |
| **WorkExperience** | id, candidateId, company, title, startDate, endDate, isCurrent | candidateId | Populated by resume parsing |
| **Question** | id, text, options[4], correctAnswer (0-3), explanation, category, difficulty, jobId, isGlobal, isAiGenerated | jobId, category, difficulty | AI-generated MCQs stored in bank |
| **Assessment** | id, sessionToken (unique), candidateId, jobId, questionIds[], status, score, tabSwitchCount, expiresAt | candidateId, jobId, status, sessionToken, expiresAt | Secure one-time session via signed token |
| **Response** | id, assessmentId+questionId (unique), selectedAnswer, isCorrect, timeTaken | assessmentId | Per-question answer log |
| **Interview** | id, candidateId, type, scheduledAt, duration, status, interviewerIds[] | candidateId, scheduledAt, status | 7 types: PHONE_SCREEN, VIDEO, ONSITE, TECHNICAL, BEHAVIORAL, FINAL, AI_VOICE |
| **AIInterviewSession** | id, interviewId (unique), pySessionId (unique), candidateName/Email, transcripts (JSON), attentionScore, violations (JSON) | interviewId, candidateEmail, status | Results from Python microservice |
| **InterviewFeedback** | id, interviewId+authorId (unique), rating, notes, recommendation | interviewId | Interviewer feedback |
| **Note** | id, candidateId, authorId, content, isPrivate | candidateId | Recruiter notes on candidates |
| **ActivityLog** | id, action, details (JSON), candidateId, userId | candidateId, createdAt | Full audit trail |
| **EmailTemplate** | id, name, subject, body, variables[], category, companyId | category, companyId | Reusable email templates |
| **PasswordResetToken** | id, token (unique), userId (unique), expiresAt | token | Password reset flow |

### Enums
- **UserRole**: ADMIN, HIRING_MANAGER, RECRUITER, INTERVIEWER, VIEWER
- **JobStatus**: DRAFT, ACTIVE, PAUSED, CLOSED, ARCHIVED
- **LocationType**: ONSITE, REMOTE, HYBRID
- **EmploymentType**: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE
- **ExperienceLevel**: ENTRY, MID, SENIOR, LEAD, EXECUTIVE
- **CandidateStage**: APPLIED, SCREENING, SHORTLISTED, ASSESSMENT_SENT, ASSESSMENT_DONE, INTERVIEW, OFFER, HIRED, REJECTED
- **AssessmentStatus**: PREPARING, PENDING, IN_PROGRESS, COMPLETED, EXPIRED, CANCELLED
- **InterviewStatus**: SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
- **InterviewType**: PHONE_SCREEN, VIDEO, ONSITE, TECHNICAL, BEHAVIORAL, FINAL, AI_VOICE
- **QuestionDifficulty**: EASY, MEDIUM, HARD

---

## Auth System

### NextAuth Configuration (`lib/auth.ts`)
- **Provider**: Credentials (email + bcrypt password hash against `User.passwordHash`)
- **Session**: JWT strategy, 30-day max age
- **JWT callbacks**: Embeds `id`, `role`, `companyId`, `companyName`, `avatar` into token
- **Session callbacks**: Copies JWT fields into `session.user`
- **Sign-in page**: `/sign-in`

### Auth Helpers
- `getCurrentUser()` — one-liner to get session user from server component
- `getSession()` — returns full session
- `withAuth(handler)` — wraps API route handler, returns 401 if no session. Passes `session.user` as 3rd arg
- `withRole(roles[], handler)` — wraps API route handler, returns 403 if user role not in allowed list

### Middleware (`middleware.ts`)
- Uses `next-auth/middleware` `withAuth`
- **Public routes** (no auth): `/api/auth`, `/api/public`, `/api/assessments/`, `/api/ai-interview`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/apply`, `/assessment`, `/ai-interview`, `/careers`
- **Protected**: All other `/api/`, `/dashboard/`, `/jobs/`, `/candidates/`, `/assessments/`, `/settings/`, `/interviews/`, etc.
- Covers 17 route prefixes

---

## AI Pipeline

### 1. Resume Parsing (`lib/ai/parse-resume.ts`)
- **Model**: Groq Llama 3.3 70B Versatile
- **Input**: Raw resume text (extracted from PDF/DOCX/TXT)
- **Output**: Structured JSON — name, email, phone, skills[], experience[], education[], totalYearsExperience
- **Retry**: 3 attempts with 1s/2s backoff
- **Zod validation**: `ParsedResumeSchema` enforces shape

### 2. File Text Extraction (`lib/file-utils.ts`)
- PDF → `pdf-parse`
- DOC/DOCX → `mammoth`
- TXT → raw buffer
- Reads from S3/R2/local via `storage.ts`

### 3. Skill Matching (`lib/ai/match-skills.ts`)
- **Model**: Groq Llama 3.3 70B Versatile
- **Input**: Candidate skills[], job skills[], job requirements[], resume text excerpt
- **Output**: `{ score: 0-100, matchingSkills[], missingSkills[], summary }`
- **Retry**: 3 attempts

### 4. Resume Processing Pipeline (`lib/ai/process-resume.ts`)
Called by the BullMQ worker. Full flow:
1. Fetch candidate + job from DB
2. Extract text from uploaded resume file
3. Parse resume via Groq → structured data
4. Match skills vs job requirements → score + matched/missing skills
5. Auto-stage: score ≥ 70 → SHORTLISTED, score ≥ 40 → SCREENING, else keep current
6. Update candidate record (resumeText, resumeParsed, aiSummary, skillMatch, matchingSkills, missingSkills, stage)
7. Upsert education + work experience records
8. Log `resume_processed` activity

### 5. MCQ Question Generation (`lib/ai/generate-questions.ts`)
- **Model**: OpenAI GPT-4o-mini
- **Input**: `QuestionGenerationConfig` — jobTitle, skills[], experienceLevel, count, difficultyMix, focusTopics, candidateContext
- **Output**: `GeneratedQuestion[]` — each with text, 4 options, correctAnswer (0-3), explanation, category, difficulty
- **Adaptive difficulty**: Based on experience level (ENTRY → 60/30/10 easy/med/hard, LEAD → 10/30/60)
- **Candidate-aware**: Adjusts questions based on matchingSkills (probe depth) vs missingSkills (assess baseline)
- **Retry**: 3 attempts
- **Zod validation**: `QuestionSchema` per question
- **Error handling**: Throws `OPENAI_API_KEY` missing on startup

---

## Queue System (BullMQ + Redis)

### Queue Definitions (`lib/queue/index.ts`)
- **resume-processing** — triggered when resume is uploaded
  - Job: `{ candidateId }`, 3 exponential retry attempts (5s base)
  - Handler: `processResume(candidateId)` (full resume pipeline)
- **email-sending** — all outgoing emails
  - Job types: `assessment-invite`, `assessment-completed`, `application-received`
  - 3 exponential retry attempts (2s base)
- **assessment-generation** — creates MCQ questions + saves to DB + sends invite email
  - Job: `AssessmentGenerationJob` (complex payload with email data, difficulty mix, candidate context)
  - 2 retry attempts
- **Graceful degradation**: Queues are null if Redis unavailable; queue functions log warning and return

### Worker (`lib/queue/worker.ts`)
- 3 dedicated workers, all connected to same Redis
- **resume-processing worker**: Calls `processResume()`
- **email-sending worker**: Switch on job name, renders HTML templates, calls `sendEmail()`
- **assessment-generation worker**: Calls `generateQuestions()`, saves to DB in transaction, updates assessment status to PENDING, sends invite email
- Start with: `npm run worker` (separate terminal)

---

## Python AI Interview Service (`ai-interview-service/`)

### Overview
Independent FastAPI microservice (port 8000) that handles AI voice interviews.

### Key Files
| File | Purpose |
|---|---|
| `main.py` | FastAPI app, session management, all endpoints, YOLO eye detection, webhook callback |
| `config.py` | GROQ_API_KEY, question count (8), time limit (30 min), session expiry (24h), pass threshold (60) |
| `question_engine.py` | Loads question pool, chooses next question by difficulty, 27 fallback questions |
| `utils.py` | Groq LLM answer evaluation, question generation from JD, follow-up generation, difficulty scaling, final score calc |
| `whisper_client.py` | Groq Whisper large-v3 STT client |

### Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check + active session count |
| POST | `/api/interview/pregenerate` | Pre-generate questions for an interview (called before candidate opens link) |
| POST | `/api/interview/start` | Start new interview session or resume existing one |
| POST | `/api/interview/transcribe` | Upload audio → Groq Whisper STT → transcript |
| POST | `/api/interview/answer` | Evaluate answer → adaptive difficulty → next question or follow-up |
| POST | `/api/interview/end` | End interview manually, trigger background finalization |
| GET | `/api/interview/{session_id}/status` | Poll status, current question, time remaining |
| POST | `/api/eye-detection/frame` | Upload frame → YOLOv8 Pose → attention status + signals |
| POST | `/api/violations/log` | Log proctoring violations |
| POST | `/api/frames/capture` | Save frame snapshot for post-interview analysis |

### Interview Flow
1. **Pre-generation**: Recruiter clicks "send interview link" → Next.js calls `POST /api/interview/pregenerate` with candidate skills + required skills → Groq generates tailored questions → saved to `questions/pregenerated/{interviewId}.json`
2. **Start**: Candidate opens link → `POST /api/interview/start` → loads pre-generated questions → returns first question + TTS introduction
3. **Answer loop** (repeats 8 times):
   - Candidate speaks → browser records audio → `POST /api/interview/transcribe` → Groq Whisper STT
   - Transcript sent to `/api/interview/answer` → Groq LLM evaluates (score + feedback + key points covered/missed)
   - If score < threshold (55): follow-up question triggered (40% weight of original + 60% of follow-up = blended score)
   - Difficulty adapts up/down based on performance
   - Next question chosen by difficulty from question pool
4. **Anti-cheat**: Browser sends periodic frames → `POST /api/eye-detection/frame` → YOLOv8n-pose detects: multiple people, looking away, eyes not visible, torso turned
5. **End**: After all questions or time limit → background task calculates final score, processes eye frames, saves results JSON, calls `POST /api/ai-interview/complete` webhook → HireVerse updates `AIInterviewSession` record

### State Management
- **In-memory**: `active_sessions` dict, keyed by UUID
- **Disk persistence**: Every state change writes to `sessions/{session_id}.json` (auto-loaded on restart)
- **Cleanup**: Daemon thread evicts sessions older than 24h
- **Session resume**: If candidate reconnects with same email + browser fingerprint, interview resumes from where they left off

### Dependencies
fastapi, uvicorn, groq (LLM + Whisper), opencv-python-headless, ultralytics (YOLOv8), librosa, soundfile, numpy, scipy, httpx

---

## File Storage (`lib/storage.ts`)

### Hybrid Strategy
- **S3 mode**: Uses `@aws-sdk/client-s3` when `S3_ACCESS_KEY_ID` is set to real credentials
- **Cloudflare R2**: Set `S3_ENDPOINT` to R2 endpoint
- **Local mode**: Falls back to `public/uploads/` when S3 not configured (dev/testing)

### API
- `uploadToS3(buffer, key, contentType)` → returns key
- `getFileFromS3(key)` → returns Buffer
- `deleteFromS3(key)`
- `getSignedDownloadUrl(key, expiresIn)` → presigned URL (S3) or local URL
- `getPublicUrl(key)` → permanent public URL

---

## Email System (`lib/email.ts`)

### Transport
- **Production**: Nodemailer with Gmail SMTP (`GMAIL_USER` + `GMAIL_APP_PASSWORD`)
- **Development**: Logs emails to console (no sending)

### Templates (inline HTML)
- `assessmentInviteHtml()` — Green-themed, shows duration + expiry, one-time link warning
- `assessmentCompletedHtml()` — Score display (color-coded: green ≥ 80, yellow ≥ 60, red < 60), pass/fail badge
- `applicationReceivedHtml()` — Confirmation for candidates
- `aiInterviewInviteHtml()` — Purple-themed, camera + mic notice

---

## Frontend Components

### Custom Components (`components/`)
| Component | Purpose |
|---|---|
| `app-shell.tsx` | Main dashboard layout — collapsible sidebar (animation), grouped nav, ⌘K command palette, department filter, theme toggle, user dropdown |
| `data-table.tsx` | Reusable data table with sorting, filtering, pagination |
| `page-header.tsx` | Consistent page title + actions bar |
| `skill-badge.tsx` | Colored skill tag component |
| `stage-badge.tsx` | Pipeline stage badge with status color mapping |
| `stat-card.tsx` | Dashboard metric card component |
| `providers.tsx` | NextAuth SessionProvider wrapper |
| `theme-provider.tsx` | next-themes provider (system/dark/light) |
| `theme-toggle.tsx` | Sun/Moon icon toggle button |

### shadcn/ui Components (`components/ui/`) — 58 files
Full shadcn/ui library installed (new-york style, neutral base, CSS variables). Key ones used heavily: button, card, dialog, dropdown-menu, form, input, select, table, tabs, badge, avatar, skeleton, sheet, tooltip, command.

### Hooks
- `use-mobile.ts` — Media query hook for responsive layout
- `use-toast.ts` / `use-toast.tsx` — Toast notification hook (shadcn sonner)

### State Management
- **Zustand** (`lib/store.ts`): `useAppStore` — sidebar collapsed state (minimal — just toggle/collapse)
- **URL state**: Heavy use of searchParams for filters, pagination, sorting (Next.js pattern)

---

## API Client (`lib/api.ts`)

Centralized typed fetch wrapper with modules:
- `authApi` — register, me
- `jobsApi` — CRUD + publish/close
- `candidatesApi` — CRUD + stage update, notes, timeline, resume upload/parse
- `assessmentsApi` — send, getByToken, start, submit, logEvent, getResults
- `questionsApi` — list, generate, delete
- `interviewsApi` — CRUD + feedback
- `analyticsApi` — dashboard, pipeline
- `publicApi` — listJobs, getJob (by slug), apply
- `teamApi` — list, invite, updateRole, remove
- `activityApi` — list
- `settingsApi` — get, update

### Key Pattern
All methods use `apiFetch<T>(url, options)` which handles JSON serialization, error extraction, and throws on non-OK responses.

---

## Data Layer (`lib/data/`)

- `dashboard.ts` — `fetchDashboardAnalytics(companyId, rangeDays)` cached via Next.js `unstable_cache` (60s revalidate, tag: `dashboard-analytics-{companyId}`)
- Returns: overview metrics, pipeline breakdown by stage, top 5 active jobs, 10 most recent activities

---

## Configuration & Infrastructure

### next.config.mjs
- Images from R2, S3, Supabase
- ESLint ignored during builds
- Experimental: stale times (30s dynamic, 180s static)

### Docker
- Single service: Redis 7 Alpine (`docker-compose.yml`)
- Persistent volume: `redis_data`
- Port: 6379

### Environment Variables (.env.example)
- **Required**: DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
- **AI**: OPENAI_API_KEY, GROQ_API_KEY
- **Storage**: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION
- **Email**: RESEND_API_KEY or GMAIL_USER + GMAIL_APP_PASSWORD
- **Redis**: REDIS_URL (default: redis://localhost:6379)

---

## NPM Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run worker` | BullMQ worker (resume + email + assessment) |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:push` | Push schema without migrations |
| `npm run prisma:seed` | Seed demo data |
| `npm run prisma:studio` | Prisma Studio GUI (port 5555) |

---

## Daily Startup (3 terminals)

```bash
# Terminal 1: Redis
docker-compose up -d

# Terminal 2: Background worker
npm run worker

# Terminal 3: Dev server
npm run dev
```

---

## Key Architectural Decisions

1. **JWT session over database sessions**: All user fields (id, role, companyId) embedded in JWT — no DB round-trip on every API call. `getCurrentUser()` is instant.
2. **Background processing via BullMQ**: Resume parsing, question generation, and email are all async via queues. The UI doesn't block waiting for AI.
3. **Python microservice for voice interviews**: Separate FastAPI service because: (a) real-time audio processing needs WebSocket-friendly runtime, (b) YOLO + OpenCV better in Python, (c) isolation from Next.js request lifecycle.
4. **Disk-persisted interview sessions**: Python service writes sessions to JSON files so interviews survive service restarts.
5. **Assessment security**: One-time session tokens (`sessionToken`), browser fingerprint hashing, tab switch counting, link expiry (24h default), IP/logging.
6. **Hybrid storage**: S3/R2 for production, local `public/uploads/` for dev — no cloud credentials needed for local dev.
7. **Dev-mode email**: Logs to console instead of sending — no email service needed for local development.
8. **AI question bank**: Questions generated per-assessment and saved to `Question` table — enables reuse across assessments and manual question management.
9. **Auto-staging**: Candidates automatically advance through pipeline based on AI skill match score (≥70 → SHORTLISTED, ≥40 → SCREENING).
10. **Adaptive interview difficulty**: Interview difficulty shifts up/down based on candidate performance, with follow-up questions for weak answers (blended scoring).

---

## Common Code Patterns

### Server Component + Client Component Split
```
page.tsx        ← Server component: fetch data, pass as props
  Client.tsx    ← Client component: interactive UI, state, events
```

### API Route Handler Pattern
```ts
// Server-side auth via getServerSession
const session = await getServerSession(authOptions)
if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

### DB Query Pattern
```ts
import { prisma } from '@/lib/prisma'  // singleton
const data = await prisma.model.findMany({ where: { companyId }, include: { ... } })
```

### Path Alias
`@/*` → project root (configured in tsconfig.json)

---

## External Services

| Service | Purpose | Config |
|---|---|---|
| Supabase | PostgreSQL hosting | DATABASE_URL, DIRECT_URL |
| Groq | Llama 3.3 70B (resume + skills + interview eval), Whisper STT | GROQ_API_KEY |
| OpenAI | GPT-4o-mini (MCQ generation) | OPENAI_API_KEY |
| AWS S3 / Cloudflare R2 | File storage | S3_* variables |
| Resend / Gmail SMTP | Email delivery | RESEND_API_KEY or GMAIL_* |
| Redis (Docker) | BullMQ job queue | REDIS_URL |
| Vercel Analytics | Frontend analytics | Auto (zero config) |
