# IS-F28: Race Condition — Non-Atomic Session File Writes

**Status:** ✅ Fixed
**Severity:** 🔴 Critical — Data Loss
**Source:** CODEBASE_AUDIT_2026-05-23.md #3
**Fixed:** 2026-05-23

## Issue
`_save_session()` wrote directly to a file with no atomic write and no file locking:
```python
_session_file(session_id).write_text(
    json.dumps(session, default=str), encoding="utf-8"
)
```
Two simultaneous requests (e.g., frame capture + answer submission) silently overwrote each other. `_save_session` is called from multiple endpoints and the cleanup thread.

## Fix
Write to a temp file first, then atomically replace using `os.replace()` (atomic on POSIX and Windows):
```python
target = _session_file(session_id)
tmp_path = target.with_suffix(".tmp")
tmp_path.write_text(json.dumps(session, default=str), encoding="utf-8")
os.replace(tmp_path, target)
```
