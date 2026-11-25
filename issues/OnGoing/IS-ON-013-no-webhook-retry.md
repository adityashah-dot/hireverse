# IS-ON-013: No Webhook Retry on Interview Completion

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Feature Gap
**Source:** CODEBASE_AUDIT_2026-05-23.md #17
**Component:** `ai-interview-service/main.py` — `_call_hireverse_webhook()`
**Phase:** Phase 3 — This Sprint

## Issue
If the Next.js webhook endpoint is temporarily down when an interview completes, results are saved only to local JSON. No retry queue, dead-letter mechanism, or exponential backoff. Results are silently lost from the HireVerse database.

## Fix
Add retry logic with exponential backoff (3-5 attempts). Consider a persistent retry queue (e.g., a local JSON file of pending webhook calls processed by a background thread).
