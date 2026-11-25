# IS-ON-022: No Input Validation on Candidate Answers

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Security
**Source:** CODEBASE_AUDIT_2026-05-23.md #26
**Component:** `ai-interview-service/main.py` — `process_answer()`
**Phase:** Phase 3 — This Sprint

## Issue
Candidate answers pass directly into the LLM prompt with no sanitization or length limit. An extremely long answer could exceed Groq's token limits or cause high API costs.

## Fix
Add max answer length validation (e.g., 5000 characters). Sanitize input before passing to LLM.
