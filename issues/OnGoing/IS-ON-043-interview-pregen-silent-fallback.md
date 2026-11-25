# IS-ON-043: Interview Pre-Generation Silent Fallback

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Half-Baked
**Source:** CODEBASE_AUDIT_2026-05-23.md #43
**Component:** `app/api/interviews/route.ts`
**Phase:** Phase 2 — This Week

## Issue
When AI question pre-generation via Groq fails, the code logs and sends the email anyway. The candidate gets 27 generic fallback questions from `question_engine.py`. The recruiter gets no visual indication that tailored questions failed — the interview appears to have been created normally.

## Fix
Add a flag/status to the interview record indicating fallback questions were used. Show a warning in the dashboard UI.
