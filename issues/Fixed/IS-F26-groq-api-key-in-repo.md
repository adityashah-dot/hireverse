# IS-F26: Live Groq API Key in Repository

**Status:** ✅ Fixed
**Severity:** 🔴 Critical — Security
**Source:** CODEBASE_AUDIT_2026-05-23.md #1
**Fixed:** 2026-05-23

## Issue
The `ai-interview-service/.env` file contained a live Groq API key committed to the repository. Anyone with repository access could use this key to run LLM inference and transcription at the owner's expense.

## Fix
1. Sanitized the `.env` file — replaced the real Groq API key with `your_groq_api_key_here`
2. Updated `HIREVERSE_WEBHOOK_SECRET` from `ai-interview-secret-change-me` to `change-me-to-a-strong-random-string`
3. Verified `.gitignore` already excludes `ai-interview-service/.env` (line 58)
4. Added `AI_SERVICE_AUTH_SECRET` to both `.env.example` files (Python service + root)
