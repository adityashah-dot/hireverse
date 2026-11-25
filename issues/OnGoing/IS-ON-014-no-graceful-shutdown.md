# IS-ON-014: No Graceful Shutdown

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Feature Gap
**Source:** CODEBASE_AUDIT_2026-05-23.md #18
**Component:** `ai-interview-service/main.py`
**Phase:** Phase 3 — This Sprint

## Issue
No `@app.on_event("shutdown")` handler. On SIGTERM:
- Active sessions in memory are lost (not persisted)
- The cleanup daemon thread dies abruptly
- In-flight Groq API calls are abandoned

## Fix
Add shutdown handler that persists all active sessions, stops the cleanup thread gracefully, and waits for in-flight requests to complete.
