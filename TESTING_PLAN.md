# HireVerse — Full System Testing Plan

**Goal:** Fresh Supabase DB + Indian mock data → test every feature → fix what breaks.

---

## Pre-Flight Setup

### 1. Create Supabase Project
- Go to [supabase.com](https://supabase.com), create new project
- Get **pooled connection string** → `DATABASE_URL`
- Get **direct connection string** → `DIRECT_URL`

### 2. `.env.local` — fill every value
```env
DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<pw>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="any-random-string-32-chars-or-more"
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."
GROQ_API_KEY="gsk_..."
REDIS_URL="redis://localhost:6379"
RESEND_API_KEY="re_..."
```

### 3. Push schema + seed
```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. 3 terminals
```bash
# T1: Redis
docker-compose up -d

# T2: Worker
npm run worker

# T3: Dev server
npm run dev
```

### 5. (Optional) AI Interview service
```bash
cd ai-interview-service
start.bat
```

---

## Test Pass 1 — Auth & Core ATS

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.1 | Landing page | Open `http://localhost:3000` | Hero, features, CTA render. No console errors. |
| 1.2 | Register company | Click "Get Started" → fill name, email, password, company name → Submit | Redirected to dashboard. Company + user created in DB. |
| 1.3 | Sign out / Sign in | Sign out from user dropdown → sign back in with same email/password | Session restored. Dashboard loads. |
| 1.4 | Forgot password | `/forgot-password` → enter email → check console for reset link (dev mode) | Reset token created in DB. |
| 1.5 | Reset password | Use token from console → `/reset-password?token=...` → set new password → sign in with new password | Password updated. Old password rejected. |
| 1.6 | Register duplicate email | Register again with same email | "User already exists" error. |
| 1.7 | Protected route without auth | Open `/dashboard` in incognito | Redirected to `/sign-in`. |

---

## Test Pass 2 — Jobs CRUD

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.1 | Create job | Dashboard → Jobs → "Create Job" → fill title, description, skills, department, location, experience level → Save | Job appears in table. Slug auto-generated. |
| 2.2 | Edit job | Click job → edit description → Save | Changes persist. |
| 2.3 | Publish job | Click "Publish" on the job | Status changes to ACTIVE. Apply link generated. |
| 2.4 | Public job page | Open apply link in incognito | Job details visible. Apply form renders. |
| 2.5 | Close job | Click "Close" on the job | Status changes to CLOSED. Apply link returns 404. |
| 2.6 | Create job with all fields | Fill every optional field (salary, employment type, location type) | All fields save and display correctly. |
| 2.7 | Create multiple jobs | Create 3+ jobs (Frontend, Backend, Data Engineer) | All appear in table. Pagination works if > 20. |

---

## Test Pass 3 — Candidate Application & Resume Processing

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.1 | Public apply — PDF | Open apply link → fill name, email, phone → upload PDF resume → Submit | Success message. Confirmation email logged. |
| 3.2 | Public apply — DOCX | Upload .docx resume | Same as above. |
| 3.3 | Public apply — no resume | Submit without file | Validation error. |
| 3.4 | Public apply — duplicate | Same email + same job, apply again | "Already applied" error. |
| 3.5 | Resume parsing | Check worker terminal — wait for "Resume processed" log | Parsed data appears in DB (`resumeParsed`, `aiSummary`, `skillMatch`, `matchingSkills`, `missingSkills`). |
| 3.6 | Candidate appears in pipeline | Dashboard → Pipeline | Card appears in APPLIED column with skill match %. |
| 3.7 | Candidate detail — Overview | Click candidate card → check Overview tab | AI Summary card, Skills Analysis (matching + missing), Profile Summary, Contact info all render. |
| 3.8 | Candidate detail — Resume tab | Switch to Resume tab | Full extracted text visible. Download button works. |
| 3.9 | Candidate detail — Activity tab | Switch to Activity tab | Timeline shows "application received", "resume uploaded", "resume processed" with needs review badge. |

---

## Test Pass 4 — AI Review (Human-in-the-Loop)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1 | AI Review tab | Open candidate → click AI Review tab | Banner shows "AI Output Needs Your Review". Raw resume text panel + AI-parsed data panel visible. |
| 4.2 | Show/hide resume text | Click "Show" on raw text panel → click "Hide" | Text toggles. Character count shown. |
| 4.3 | Inline edit AI summary | Hover over AI Summary in Overview → click pen icon → edit text → Save | Summary updated in DB. Activity logged. |
| 4.4 | Inline edit matching skills | Click edit on Matching Skills → change skills → Save | Skills array updated. Re-fetched on page. |
| 4.5 | Override skill match score | AI Review tab → click "Override Score" → enter new number → Save | Score updated. Progress bar reflects new value. |
| 4.6 | Approve AI output | AI Review tab → click "Approve AI Output" | Banner turns green "AI Output Reviewed & Approved". aiReviewed = true in DB. |
| 4.7 | Approve & auto-stage | If match ≥ 70, click "Approve & Move to Shortlisted" | Candidate moves to SHORTLISTED. Stage badge updates. |
| 4.8 | Re-parse resume | AI Review tab → click "Re-parse Resume" → wait | New parse results appear. Activity log shows new "resume_processed" event. |
| 4.9 | No resume edge case | Candidate without resume → AI Review tab | Shows "No AI Data Yet" with upload prompt. |
| 4.10 | Education + Experience display | Overview tab → scroll to Work Experience + Education sections | Cards show company, title, dates, institution, degree, GPA. |

---

## Test Pass 5 — Pipeline (Kanban)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5.1 | All 9 stages visible | Dashboard → Pipeline | Columns: APPLIED, SCREENING, SHORTLISTED, ASSESSMENT_SENT, ASSESSMENT_DONE, INTERVIEW, OFFER, HIRED. |
| 5.2 | Rejected column | Click "Show Rejected" | REJECTED column appears below with rejected candidates. |
| 5.3 | Drag candidate | Drag from APPLIED → SCREENING | Card moves. Toast confirms. Stage updates in DB. |
| 5.4 | Drag to invalid stage | Try dropping on non-target area | Card snaps back. No API call. |
| 5.5 | Filter by job | Select specific job from dropdown | Only candidates for that job shown. |
| 5.6 | Right-click actions | Hover card → click "..." → Send Email / Schedule Interview / Send Assessment | Redirects to send-links page with candidate pre-selected. |
| 5.7 | Reject candidate | "..." → Reject | Candidate moves to REJECTED column. Stage = REJECTED in DB. |
| 5.8 | Needs review indicator | Candidate with un-reviewed AI data | Amber triangle icon + "AI needs review" badge on card. |

---

## Test Pass 6 — Assessment (MCQ)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.1 | Send assessment | Candidate detail → "Schedule Assessment" → leave defaults → click | Toast confirms. Candidate stage → ASSESSMENT_SENT. Email logged. |
| 6.2 | Assessment PREPARING state | Immediately open assessment link after sending | "Still being prepared" message shown (if worker hasn't generated yet). |
| 6.3 | Assessment ready | Wait for worker log "[Worker] Assessment ready" → refresh link | Questions load. 20-25 questions shown. Timer set. |
| 6.4 | Take assessment | Answer all questions → navigate with Previous/Next → Submit | All answers saved. Score calculated. |
| 6.5 | Assessment results — recruiter | Candidate detail → Assessment tab | Score %, question count, correct count displayed. |
| 6.6 | Timer expires | Start assessment, wait out timer (reduce duration for testing) | Auto-submit on expiry. |
| 6.7 | Tab switch detection | During assessment, switch tabs 3 times | tabSwitchCount increments. Logged as proctoring event. |
| 6.8 | Expired link | Wait 48h (or reduce expiresInHours) → open link | "Assessment link has expired" message. |
| 6.9 | Completed link | Open link after submission | "Assessment already completed" message. |
| 6.10 | Duplicate assessment | Try sending assessment to same candidate while one is PREPARING/PENDING | "Candidate already has a pending assessment" error. |
| 6.11 | Assessment stage update | Check candidate stage after completion | Stage → ASSESSMENT_DONE. |

---

## Test Pass 7 — AI Voice Interview

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7.1 | Schedule AI interview | Candidate detail → Schedule interview (or via pipeline) → fill type, date, duration → Submit | Interview created. Pre-generation attempted. Email sent with calendar invite. |
| 7.2 | AI meta page | Open interview link → `/ai-interview/[sessionId]` | Candidate name, position, type, duration, requirements shown. "Allow Camera & Mic" button. |
| 7.3 | Pre-generation failure recovery | If Python service is down when creating interview | Interview still created. Notes show "[AI question pre-generation failed. Using fallback question pool.]" |
| 7.4 | Start interview | Grant permissions → click "Start AI Interview" | Redirect to `/live` page. Session starts in Python service. |
| 7.5 | Live page — intro state | Live page loads | Welcome message, name, position, question count, camera feed visible. |
| 7.6 | Live page — question state | Click "Start Interview" | First question shown. "Start Recording" button appears. |
| 7.7 | Live page — recording | Click "Start Recording" → speak answer → click "Stop Recording & Submit" | Audio sent to Python STT. Spinner shows "Evaluating...". |
| 7.8 | Live page — evaluation result | After processing | Score (color-coded), feedback, key points covered/missed shown. "Next Question" button. |
| 7.9 | Follow-up question | Give intentionally weak answer | Follow-up question triggered. Amber badge shown. Option to answer or skip. |
| 7.10 | Complete interview | Answer all questions (or time runs out) | "Interview Complete!" screen with final score. Results saved. |
| 7.11 | Webhook saves results | Check DB after interview completes | `AIInterviewSession` record created. Interview status → COMPLETED. Candidate advanced to OFFER/INTERVIEW. |
| 7.12 | Eye tracking | During live interview, check Python service logs | YOLO frames being processed every 3 seconds. Attention score calculated. |
| 7.13 | Timer expiry | Let interview timer expire | "Time's Up" screen. Answers saved. |

---

## Test Pass 8 — Dashboard & Analytics

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 8.1 | Dashboard loads | Navigate to `/dashboard` | Stat cards (Total Jobs, Active Jobs, Total Candidates, Hires) with real numbers. Pipeline breakdown chart. Top 5 active jobs. Recent activities feed. |
| 8.2 | AI Insights | Navigate to `/ai-insights` | Real insights generated (stuck candidates, top match, conversion rate, referral source). No mock data. |
| 8.3 | Notifications | Navigate to `/notifications` | Activity-based notifications. Filter by type (All, Unread, Candidates, Assessments). |
| 8.4 | Reports | Navigate to `/reports` | Charts rendered with real data. Time range filter works. Department filter works. |
| 8.5 | Sidebar navigation | Click every nav item | Each page loads without error. Active state shown. |
| 8.6 | ⌘K command palette | Press Ctrl+K | Palette opens. Type letter to navigate. ESC closes. |
| 8.7 | Theme toggle | Click sun/moon icon | Dark/light mode toggles. Persists on reload. |
| 8.8 | Collapsible sidebar | Click chevron on sidebar | Sidebar collapses to icons. Expands back. |
| 8.9 | Mobile menu | Resize browser to mobile width | Hamburger menu appears. Sidebar becomes overlay. |

---

## Test Pass 9 — Settings, Team & Misc

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.1 | Company settings | `/settings` → change assessment duration, passing score → Save | Values persist. New assessments use updated defaults. |
| 9.2 | Email config | Settings → update sender name, reply-to email → Save | New emails use updated sender. |
| 9.3 | Team — invite member | `/team` → invite new member with name, email, role | User created. Temp password shown once. |
| 9.4 | Team — change role | Change role of existing member | Role updates. Access restricted accordingly. |
| 9.5 | Team — remove member | Remove a team member | User can no longer sign in (or soft-deleted). |
| 9.6 | Calendar | `/calendar` → view monthly calendar | Interviews displayed on correct dates. Create new event via dialog. |
| 9.7 | Bulk actions | `/bulk-actions` → select multiple candidates → change stage → apply | All selected candidates' stages update. |
| 9.8 | Send links | `/send-links` → select candidate → assessment template → customize → send | Assessment created + email queued. |
| 9.9 | Email templates | `/email-templates` → view defaults → create custom template → preview → save | Template saved to DB. Available in send-links. |
| 9.10 | Careers page | `/careers` in incognito | All ACTIVE jobs listed. Click a job → detail page with apply form. |

---

## Test Pass 10 — Edge Cases & Error Handling

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.1 | Worker down | Stop worker → upload resume → start worker | Resume gets processed when worker restarts (BullMQ retry). |
| 10.2 | Redis down | `docker-compose down` → upload resume | Queue operations log warning. Candidate saved. App doesn't crash. |
| 10.3 | OpenAI key missing | Remove OPENAI_API_KEY → restart worker → try sending assessment | Worker stays running. Assessment send returns error but doesn't crash. |
| 10.4 | Groq key missing | Remove GROQ_API_KEY → upload resume | Resume parsing fails gracefully. Candidate stays in APPLIED with no AI data. |
| 10.5 | Invalid assessment link | Open `/assessment/fake-token` | "Assessment not found" error. |
| 10.6 | Large resume file | Upload > 10MB PDF from public apply | "File too large" error. |
| 10.7 | Wrong file type | Upload .png as resume | "Only PDF, DOC, and DOCX" error. |
| 10.8 | Concurrent applications | Open apply page in 3 tabs → submit all at once | All 3 save. No duplicate key errors. |
| 10.9 | Stage change to invalid value | Call API directly with bad stage | Zod validation rejects. 400 response. |
| 10.10 | Candidate not in company | Try accessing candidate from different company | 404 response. |

---

## Test Pass 11 — AI Interview Service (Python)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 11.1 | Health check | `GET http://localhost:8000/health` | Status healthy, active_sessions count. |
| 11.2 | Pre-generate questions | `POST /api/interview/pregenerate` with interview_id, position, skills | Questions saved to `questions/pregenerated/{id}.json`. Returns question count + difficulty breakdown. |
| 11.3 | Start session | `POST /api/interview/start` with candidate info | Session created. First question returned. Introduction TTS text. |
| 11.4 | Transcribe audio | `POST /api/interview/transcribe` with webm file | Transcript text returned. |
| 11.5 | Evaluate answer | `POST /api/interview/answer` with transcript | Score, feedback, key points returned. |
| 11.6 | Adaptive difficulty | Answer 3 questions correctly | Difficulty increases (easy → medium → hard). |
| 11.7 | Session persistence | Kill Python service mid-interview → restart → reconnect | Session reloaded from JSON. Interview resumes. |
| 11.8 | Session expiry | Wait 24h → try to access session | Session evicted. 404 response. |

---

## Quick Reference — Files to Check If Something Breaks

| Feature | Key Files |
|---------|-----------|
| Auth | `lib/auth.ts`, `middleware.ts`, `app/api/auth/[...nextauth]/route.ts` |
| Jobs | `app/api/jobs/route.ts`, `app/(dashboard)/jobs/page.tsx` |
| Candidates | `app/api/candidates/[id]/route.ts`, `app/(dashboard)/candidates/[candidateId]/page.tsx` |
| Pipeline | `app/(dashboard)/pipeline/page.tsx` |
| Resume processing | `lib/ai/process-resume.ts`, `lib/ai/parse-resume.ts`, `lib/queue/worker.ts` |
| AI Review | `app/(dashboard)/candidates/[candidateId]/page.tsx` (AI Review tab) |
| Assessments | `app/api/assessments/send/route.ts`, `app/(assessment)/assessment/[sessionId]/page.tsx` |
| AI Interview | `app/api/ai-interview/[...path]/route.ts`, `app/(assessment)/ai-interview/[sessionId]/live/page.tsx` |
| Python service | `ai-interview-service/main.py`, `ai-interview-service/utils.py` |
| Analytics | `app/api/analytics/dashboard/route.ts`, `lib/data/dashboard.ts` |
| Notifications | `app/api/activity/route.ts`, `app/(dashboard)/notifications/page.tsx` |
| Email | `lib/email.ts`, `lib/queue/worker.ts` (email worker) |
| Storage | `lib/storage.ts`, `lib/file-utils.ts` |

---

> **Start at Pass 1. Don't skip. Log every failure here. Fix before moving to next pass.**
