# IS-ON-026: _SIGNAL_TO_VIOLATION Dict Defined Inside Endpoint

**Status:** 🔵 OnGoing
**Severity:** 🔵 Minor — Performance
**Source:** CODEBASE_AUDIT_2026-05-23.md #16
**Component:** `ai-interview-service/main.py` — `process_eye_frame()`
**Phase:** Phase 4 — Backlog

## Issue
The `_SIGNAL_TO_VIOLATION` dictionary is defined inside the `process_eye_frame()` function body, recreated on every frame processing call.

## Fix
Move to module-level constant.
