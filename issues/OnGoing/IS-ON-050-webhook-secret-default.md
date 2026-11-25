# IS-ON-050: AI Interview Webhook Secret Is Default Value

**Status:** 🟠 OnGoing
**Severity:** 🟠 Major — Security
**Source:** CODEBASE_AUDIT_2026-05-23.md #52
**Component:** `.env`
**Phase:** Phase 2 — This Week

## Issue
```
AI_INTERVIEW_WEBHOOK_SECRET="ai-interview-secret-change-me"
```
The default placeholder value from code is used as-is. Anyone who knows this default can spoof webhook calls to the `/api/ai-interview/complete` endpoint, injecting fake interview results.

## Fix
Rotate to a strong random string (e.g., `openssl rand -hex 32`).
