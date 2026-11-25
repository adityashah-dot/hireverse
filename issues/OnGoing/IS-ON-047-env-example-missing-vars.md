# IS-ON-047: .env.example Missing Required Variables

**Status:** 🟠 OnGoing
**Severity:** 🟠 Major — Onboarding
**Source:** CODEBASE_AUDIT_2026-05-23.md #48
**Component:** `.env.example`
**Phase:** Phase 2 — This Week

## Issue
`.env.example` fails to document several variables actively used by the code:
- `GROQ_API_KEY` — used by `parse-resume.ts`, `match-skills.ts`, and Python service
- `AI_INTERVIEW_SERVICE_URL` — used by interview API proxy
- `AI_INTERVIEW_WEBHOOK_SECRET` — used by webhook verification
- `GMAIL_USER` and `GMAIL_APP_PASSWORD` — used by `lib/email.ts`

Developers following `.env.example` alone can't run the AI interview service or resume parsing.

## Fix
Add all missing required env vars to `.env.example` with placeholder values and descriptions.
