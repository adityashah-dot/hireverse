# IS-ON-019: Zero Tests — Python Service

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Testing
**Source:** CODEBASE_AUDIT_2026-05-23.md #19
**Component:** `ai-interview-service/`
**Phase:** Phase 4 — Backlog

## Issue
Not a single Python test file exists in `ai-interview-service/`. The `tests/` directory at project root contains only TypeScript tests. Zero unit tests, integration tests, or test fixtures for the entire Python codebase.

## Fix
Add `pytest` with test coverage for:
- Question engine (deterministic question selection)
- Utils (answer evaluation, difficulty scaling, final score calculation)
- Session management (create, save, load, cleanup)
- API endpoints (FastAPI TestClient)
