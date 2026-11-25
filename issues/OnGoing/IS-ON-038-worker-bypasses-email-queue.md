# IS-ON-038: Assessment-Generation Worker Bypasses Email Queue

**Status:** 🔴 OnGoing
**Severity:** 🔴 Critical — Reliability
**Source:** CODEBASE_AUDIT_2026-05-23.md #38
**Component:** `lib/queue/worker.ts`
**Phase:** Phase 2 — This Week

## Issue
The assessment-generation worker calls `sendEmail()` directly instead of queuing via `emailQueue`. This means:
- No retry if email fails
- Blocks the worker during email sending
- Bypasses the `email-sending` worker entirely

Compare to the `assessment-completed` case in the submit route which correctly uses `queueEmail()`.

## Fix
Replace direct `sendEmail()` call with `queueEmail()`.
