# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HireVerse** is a full-stack AI-powered Applicant Tracking System (ATS) built with Next.js 16 App Router. It handles the complete recruitment pipeline: resume parsing, skill matching, MCQ assessments with proctoring, interview scheduling, and analytics.

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run worker           # Start BullMQ background worker (separate terminal)

# Database
npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:migrate   # Create and run new migrations
npm run prisma:push      # Push schema without migration (dev only)
npm run prisma:seed      # Seed with demo data
npm run prisma:studio    # Open Prisma GUI

# Build & Quality
npm run build            # Production build
npm run lint             # ESLint

# Infrastructure (required for local dev)
docker-compose up -d     # Start Redis (needed for BullMQ queues)
```

There is no test suite configured.

## Environment Setup

Copy `.env.example` to `.env.local`. Required variables:
- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL (Supabase)
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`
- `OPENAI_API_KEY` — GPT-4 (question generation)
- `GROQ_API_KEY` — Llama 3.3 70B (resume parsing)
- `REDIS_URL` — Redis for BullMQ
- S3/R2 credentials for file storage
- `RESEND_API_KEY` for email

## Architecture

### Full-Stack Structure
This is a **Next.js monorepo** — no separate frontend/backend. API routes live in `app/api/`, pages in `app/`, shared logic in `lib/`.

### Auth & Route Protection
- `lib/auth.ts` — NextAuth config with Credentials provider, bcrypt hashing, session JWT
- `middleware.ts` — Protects all routes except `/api/public/*`, `/apply/*`, `/assessment/*`, `/careers/*`
- `withAuth()` / `withRole()` wrappers in `lib/auth.ts` guard individual API handlers

### Database Layer
- Prisma ORM with PostgreSQL; schema at `prisma/schema.prisma`
- After any schema change: run `npm run prisma:generate` + `npm run prisma:migrate`

### AI Pipeline
- `lib/ai/parse-resume.ts` — Groq (Llama 3.3 70B) parses uploaded resumes
- `lib/ai/match-skills.ts` — Skill matching between candidate and job requirements
- `lib/ai/generate-questions.ts` — OpenAI GPT-4 generates MCQ question bank
- `lib/ai/process-resume.ts` — Orchestrates the full resume processing flow

### Background Jobs
- BullMQ queues defined in `lib/queue/index.ts`; workers in `lib/queue/worker.ts`
- **The worker process must run separately** (`npm run worker`) alongside the dev server
- Handles: resume processing, email sending

### File Storage
- `lib/storage.ts` — Abstracts S3/Cloudflare R2 uploads and presigned URLs
- `lib/file-utils.ts` — Extracts text from PDF (`pdf-parse`) and DOC (`mammoth`) files

### Email
- `lib/email.ts` — Sends via Resend or Nodemailer; contains HTML templates inline

### Candidate Pipeline States
`APPLIED → SCREENING → SHORTLISTED → ASSESSMENT → INTERVIEW → OFFER → HIRED`

### Assessment Flow
Assessments are delivered via signed tokens at `/assessment/[token]` (public route). Security events are recorded during assessment taking.

### UI Components
- `components/ui/` — shadcn/ui component library (New York style, ~40 components)
- Path alias `@/` maps to the repo root; use it for all imports

### Key Architectural Notes
- `next.config.mjs` has `eslint: { ignoreDuringBuilds: true }` — ESLint warnings won't fail the build. TypeScript compilation errors WILL fail the build.
- The `app/(dashboard)/` route group shares a dashboard layout
- The `app/(auth)/` route group shares an auth layout
- `app/(assessment)/` is the standalone proctored assessment UI
