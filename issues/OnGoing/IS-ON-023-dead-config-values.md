# IS-ON-023: Dead Config Values

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Dead Code
**Source:** CODEBASE_AUDIT_2026-05-23.md #13
**Component:** `ai-interview-service/config.py`
**Phase:** Phase 3 — This Sprint

## Issue
Several config values defined but never used:
- `MIN_GOOD_ANSWER_WORDS = 10` — never referenced anywhere
- `AI_INTERVIEW_PASS_THRESHOLD` — `calculate_final_score()` has its own hardcoded thresholds (80/60/40)

## Fix
Either wire these config values into the code that should use them, or remove them to avoid confusion.
