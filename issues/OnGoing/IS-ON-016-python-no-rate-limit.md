# IS-ON-016: No Rate Limiting on Python Service Endpoints

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Security
**Source:** CODEBASE_AUDIT_2026-05-23.md #21
**Component:** `ai-interview-service/main.py`
**Phase:** Phase 3 — This Sprint

## Issue
No protection against flooding expensive endpoints:
- `/eye-detection/frame` — runs YOLO inference on every frame
- `/transcribe` — calls Groq's paid Whisper API
- `/answer` — calls Groq's paid LLM API

A single client could generate unlimited costs.

## Fix
Add rate limiting middleware (e.g., `slowapi` with FastAPI). Limit per session and per IP.
