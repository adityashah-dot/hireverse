# IS-ON-049: Timer Discrepancy Across Services

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Design
**Source:** CODEBASE_AUDIT_2026-05-23.md #50
**Component:** Multiple
**Phase:** Phase 4 — Backlog

## Issue
Three different time windows govern the interview lifecycle with no unified source:
- Next.js access window: ±10 minutes from scheduled time
- Python session expiry: 24 hours (`config.py`)
- Python interview time limit: 30 minutes (`config.py`)

A candidate could start within the 10-min window but their session could already be cleaned up (edge case). The Next.js layer doesn't track how long the Python session has been running.

## Fix
Unify timer configuration in a single place. Have the Next.js layer poll or receive timeout callbacks from the Python service.
