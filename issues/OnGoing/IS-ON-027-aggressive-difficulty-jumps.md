# IS-ON-027: Aggressive Difficulty Jumps

**Status:** 🔵 OnGoing
**Severity:** 🔵 Minor — Design
**Source:** CODEBASE_AUDIT_2026-05-23.md #27
**Component:** `ai-interview-service/utils.py` — `update_difficulty()`
**Phase:** Phase 4 — Backlog

## Issue
```python
if score >= passing_threshold + 25 and idx == 0:
    return "hard"
```
A candidate who aces one easy question jumps directly from "easy" to "hard", skipping "medium". Possibly intentional but seems like a design smell. Could frustrate candidates with drastic difficulty changes.

## Fix
Consider stepping through difficulty levels incrementally (easy → medium → hard) regardless of score.
