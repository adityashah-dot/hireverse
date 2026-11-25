# IS-F14: Manual Resume Parse Bypasses Queue

**Status:** ✅ Fixed
**Severity:** 🔧 Code Quality
**Source:** AUDIT_REPORT.md #26
**Fixed:** May 2026

## Issue
`app/api/candidates/[id]/parse/route.ts` called `processResume(id)` directly, blocking the API route for 10-30 seconds. If Groq timed out, the recruiter got a 500 with no retry.

## Fix
Parse route now calls `queueResumeProcessing()` — async, non-blocking, with retry via BullMQ.
