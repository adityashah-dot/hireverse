# IS-F38: Non-Atomic In-Memory Frame Counter

**Status:** ✅ Fixed
**Severity:** 🟠 Major — Race Condition
**Source:** CODEBASE_AUDIT_2026-05-23.md #12
**Component:** `ai-interview-service/main.py` — `process_eye_frame()` and `capture_frame()`
**Phase:** Phase 2 — This Week

## What Changed
Added a per-session `asyncio.Lock` (`_frame_locks` dict) that both frame endpoints acquire before the read-increment-write of `_frame_count`. Without the lock, two concurrent frame requests could read the same counter value, causing duplicate frame numbers and potential file overwrites.

### Before
```python
frame_count = live_session.get("_frame_count", 0) + 1
live_session["_frame_count"] = frame_count
```

### After
```python
lock = _frame_locks.setdefault(session_id, asyncio.Lock())
async with lock:
    frame_count = live_session.get("_frame_count", 0) + 1
    live_session["_frame_count"] = frame_count
```

**Fixed:** 2026-05-24
