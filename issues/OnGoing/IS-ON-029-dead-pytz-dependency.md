# IS-ON-029: Dead Dependency pytz

**Status:** 🔵 OnGoing
**Severity:** 🔵 Minor — Dead Code
**Source:** CODEBASE_AUDIT_2026-05-23.md #30
**Component:** `ai-interview-service/requirements.txt`
**Phase:** Phase 4 — Backlog

## Issue
`pytz==2024.1` listed in `requirements.txt` but never imported anywhere in the Python service.

## Fix
Remove from `requirements.txt`.
