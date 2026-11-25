# IS-ON-021: Unbounded Storage Growth

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Operations
**Source:** CODEBASE_AUDIT_2026-05-23.md #25
**Component:** `ai-interview-service/main.py`
**Phase:** Phase 3 — This Sprint

## Issue
Multiple directories accumulate files forever with no cleanup:
- `active_sessions` dict: no size cap
- `eye_logs/`: frame captures never cleaned up
- `sessions/`: only expired sessions cleaned (24h window)
- `results/`: JSON files accumulate forever
- `violations/`: JSON files accumulate forever

Over time, disk usage grows unbounded.

## Fix
Add age-based cleanup for all directories. Add size cap for in-memory sessions. Run periodic cleanup (daily cron or daemon thread).
