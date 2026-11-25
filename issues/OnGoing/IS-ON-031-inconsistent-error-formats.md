# IS-ON-031: Inconsistent Error Response Formats

**Status:** 🔵 OnGoing
**Severity:** 🔵 Minor — Consistency
**Source:** CODEBASE_AUDIT_2026-05-23.md #31
**Component:** `ai-interview-service/main.py`
**Phase:** Phase 4 — Backlog

## Issue
`process_eye_frame` returns `{"status": "error", ...}` on failure instead of raising `HTTPException`. Other endpoints raise `HTTPException`. Inconsistent error handling pattern.

## Fix
Standardize on `HTTPException` for all error responses.
