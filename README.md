# HireVerse

AI-powered Applicant Tracking System built with Next.js 16 App Router.

Handles the full recruitment pipeline: resume parsing → skill matching → MCQ assessments → AI voice interviews → offer management.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL via Supabase + Prisma ORM |
| Auth | NextAuth.js (Credentials) |
| AI — Resume | Groq Llama 3.3 70B |
| AI — Questions | OpenAI GPT-4 |
| AI — Interview | FastAPI + Groq Whisper + Llama 3.3 |
| Storage | AWS S3 / Cloudflare R2 |
| Email | Resend |
| Background Jobs | BullMQ + Redis |
| Styling | Tailwind CSS + shadcn/ui |

---

## Quick Start

See **[docs/SETUP.md](./docs/SETUP.md)** for the full step-by-step guide.

**Daily startup (3 commands):**
```bash
docker-compose up -d   # Redis
npm run worker         # BullMQ background worker (separate terminal)
npm run dev            # Next.js dev server
```

---

## Project Structure

```
app/
  (auth)/          # Sign in, sign up, password reset
  (dashboard)/     # Recruiter dashboard — jobs, candidates, assessments, interviews
  (assessment)/    # Candidate-facing assessment + AI interview UI (public routes)
  api/             # All API routes

lib/
  ai/              # Resume parsing, skill matching, MCQ generation
  queue/           # BullMQ job definitions and worker
  data/            # Cached server-side data fetchers
  email.ts         # Email templates + Resend sender
  auth.ts          # NextAuth config + auth helpers
  prisma.ts        # Prisma client singleton
  storage.ts       # S3/R2 file uploads

ai-interview-service/   # Python FastAPI — voice interview microservice
  main.py               # Session management, transcription, eye detection
  utils.py              # Answer evaluation (Groq LLM)
  question_engine.py    # Question selection + adaptive difficulty
  whisper_client.py     # Groq Whisper STT client

prisma/
  schema.prisma    # Database schema
  seed.ts          # Demo data seeder
```

---

## Candidate Pipeline

```
APPLIED → SCREENING → SHORTLISTED → ASSESSMENT → INTERVIEW → OFFER → HIRED
```

---

## Key Features

- **Resume parsing** — Upload PDF/DOC, Groq AI extracts skills, experience, education
- **Skill matching** — Semantic comparison of candidate skills vs job requirements
- **MCQ assessments** — AI-generated question banks, proctored delivery via signed tokens
- **AI voice interviews** — FastAPI microservice handles speech-to-text, adaptive questioning, eye-tracking
- **Analytics dashboard** — Pipeline metrics, time-to-hire, top jobs, activity feed

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values. Required:
- `DATABASE_URL` / `DIRECT_URL` — Supabase PostgreSQL
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`
- `OPENAI_API_KEY` — MCQ question generation
- `GROQ_API_KEY` — Resume parsing + AI interview evaluation
- `REDIS_URL` — BullMQ (default: `redis://localhost:6379`)
