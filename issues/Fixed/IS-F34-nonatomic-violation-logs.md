# IS-F34: Non-Atomic Violation Log Writes

**Status:** ✅ Fixed
**Severity:** 🟠 Major — Data Loss
**Source:** CODEBASE_AUDIT_2026-05-23.md #8
**Component:** `ai-interview-service/main.py` — `log_violation()`
**Phase:** Phase 2 — This Week

## Issue
Read-modify-write cycle with no locking:
```python
existing = json.loads(vfile.read_text())  # read
existing.append(violation_data)
vfile.write_text(json.dumps(existing))    # write
```
Two simultaneous violation logs → one overwrites the other → lost violations.

## Fix
Added per-session `threading.Lock` (`_violation_locks` dict) and atomic writes (write to `.tmp`, then `os.replace()`) matching the pattern already used by `_save_session()`:
```python
lock = _violation_locks.setdefault(req.sessionId, threading.Lock())
with lock:
    existing = []
    if vfile.exists():
        existing = json.loads(vfile.read_text())
    existing.append(violation_data)
    tmp_path = vfile.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(existing, indent=2))
    os.replace(tmp_path, vfile)
```

## Changed
- `ai-interview-service/main.py`: Added `_violation_locks` dict on line 168, wrapped violation file read-modify-write in `log_violation()` with per-session lock + atomic write.

## Date
2026-05-23
