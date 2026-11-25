# IS-F37: Datetime Fields Not Restored on Session Load

**Status:** ✅ Fixed
**Severity:** 🟠 Major — Bug
**Source:** CODEBASE_AUDIT_2026-05-23.md #11 → IS-ON-011
**Component:** `ai-interview-service/main.py` — `_load_session()`
**Phase:** Phase 2 — This Week

## Issue
Only restored `created_at` and `interview_timer_started` from ISO strings:
```python
for key in ("created_at", "interview_timer_started"):
    if isinstance(data.get(key), str):
        data[key] = datetime.fromisoformat(data[key])
```
`start_time` and `end_time` are stored as ISO strings but never converted back to datetime. Functions checking `start_time` as datetime break.

## What Changed
Added `start_time` and `end_time` to the restoration loop in `_load_session()`.

**Fixed:** 2026-05-23
