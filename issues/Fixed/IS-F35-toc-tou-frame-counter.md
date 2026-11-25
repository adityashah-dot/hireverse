# IS-F35: TOCTOU Race in Frame Counter

**Status:** ✅ Fixed
**Severity:** 🟠 Major — Data Loss
**Source:** CODEBASE_AUDIT_2026-05-23.md #9 → IS-ON-009
**Component:** `ai-interview-service/main.py` — `capture_frame()`
**Phase:** Phase 2 — This Week

## Issue
```python
count = int(counter_file.read_text()) + 1 if counter_file.exists() else 1
counter_file.write_text(str(count))
```
Classic time-of-check-to-time-of-use. Two simultaneous frame captures can read the same count, both write `count+1`, losing a frame number and potentially overwriting frame files.

## What Changed
Replaced file-based counter with in-memory counter via the live session dict (`live_session["_frame_count"]`), matching the approach already used by `process_eye_frame()`. Falls back to file-based counter only when no live session exists (rare edge case for sessions not yet in memory).

**Fixed:** 2026-05-23
