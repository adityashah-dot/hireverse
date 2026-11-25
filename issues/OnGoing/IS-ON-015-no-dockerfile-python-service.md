# IS-ON-015: No Dockerfile for Python Service

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — DevOps
**Source:** CODEBASE_AUDIT_2026-05-23.md #20
**Component:** `ai-interview-service/`
**Phase:** Phase 3 — This Sprint

## Issue
`docker-compose.yml` only defines Redis. There's no `Dockerfile` for the Python AI service. The `start.bat` is Windows-only — no `start.sh` or production deployment story. Running the full system requires 4 terminals locally.

## Fix
Create a `Dockerfile` for the Python service with proper dependency installation and YOLO model download. Add it to `docker-compose.yml`.
