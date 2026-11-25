# IS-ON-017: print() Instead of Structured Logging

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Observability
**Source:** CODEBASE_AUDIT_2026-05-23.md #22
**Component:** `ai-interview-service/` — all files
**Phase:** Phase 3 — This Sprint

## Issue
Every error, warning, and info message in the Python service uses `print()`. No log levels, timestamps, rotation, or structured output. Difficult to monitor in production.

## Fix
Replace `print()` with Python's `logging` module or a structured logger like `structlog`. Add log levels, correlation IDs, and file rotation.
