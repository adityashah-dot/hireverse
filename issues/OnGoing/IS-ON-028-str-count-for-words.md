# IS-ON-028: clean_transcript() Uses str.count() for Word Detection

**Status:** 🔵 OnGoing
**Severity:** 🔵 Minor — Bug
**Source:** CODEBASE_AUDIT_2026-05-23.md #28
**Component:** `ai-interview-service/utils.py` — `clean_transcript()`
**Phase:** Phase 4 — Backlog

## Issue
```python
if lower.count(h) >= 2 and len(text.split()) < 15:
```
`str.count()` counts substring occurrences, not words. `"goodbye"` in `"goodbyegoodbye"` counts twice. Practically unlikely to matter but technically incorrect.

## Fix
Use word boundary matching or split into words first.
