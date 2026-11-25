# IS-F03: generate-questions.ts Top-Level Crash on Missing OPENAI_API_KEY

**Status:** ✅ Fixed
**Severity:** 🔴 Critical
**Source:** AUDIT_REPORT.md #3
**Fixed:** May 2026

## Issue
`lib/ai/generate-questions.ts` threw at import time when `OPENAI_API_KEY` was missing, crashing the entire worker process (including resume processing and email sending which don't need OpenAI).

## Fix
Moved `OPENAI_API_KEY` validation into lazy `getOpenAI()` function. Worker no longer crashes on module import. Function throws only when actually called.
