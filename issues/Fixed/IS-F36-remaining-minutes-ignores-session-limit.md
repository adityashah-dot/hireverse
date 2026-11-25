# IS-F36: get_remaining_minutes() Ignores Session Time Limit

**Status:** ✅ Fixed
**Severity:** 🟠 Major — Bug
**Source:** CODEBASE_AUDIT_2026-05-23.md #10 → IS-ON-010
**Component:** `ai-interview-service/main.py` — `get_remaining_minutes()`
**Phase:** Phase 2 — This Week

## Issue
```python
return max(0.0, round(config.INTERVIEW_TIME_LIMIT_MINUTES - elapsed, 2))
```
Always uses the global `config.INTERVIEW_TIME_LIMIT_MINUTES` (30) regardless of the session's own `time_limit_minutes`. Custom-duration interviews show wrong remaining time.

## What Changed
`get_remaining_minutes()` now reads `session.get("time_limit_minutes", config.INTERVIEW_TIME_LIMIT_MINUTES)` first, falling back to the global default only when the session has no custom limit set.

**Fixed:** 2026-05-23
