# IS-F32: OPENAI_API_KEY Missing — Migrated to Groq

**Status:** ✅ Fixed
**Severity:** 🔴 Critical — Broken Feature
**Source:** CODEBASE_AUDIT_2026-05-23.md #21 / #32
**Fixed:** 2026-05-23

## Issue
The `.env` file had `GROQ_API_KEY` but no `OPENAI_API_KEY`. `generate-questions.ts` used OpenAI's `gpt-4o-mini` via `getOpenAI()`, which threw when the key was missing. MCQ question generation was completely broken — the assessment-generation worker would fail on every job.

## Fix
Migrated `generate-questions.ts` from OpenAI to Groq (Llama 3.3 70B Versatile):

1. **Replaced SDK**: `import OpenAI from 'openai'` → `import Groq from 'groq-sdk'`
2. **Same API surface**: Groq SDK is OpenAI-compatible, so `chat.completions.create()` calls work identically
3. **Same model family**: Uses `llama-3.3-70b-versatile` — same model already used by `parse-resume.ts` and `match-skills.ts`
4. **Removed `response_format: { type: 'json_object' }`**: Groq Llama models handle structured JSON without this flag
5. **Kept Zod validation**: `QuestionSchema` still validates every question
6. **Removed `openai` from `package.json`**: No more OpenAI dependency
7. **Updated `.env.example`**: Replaced `OPENAI_API_KEY` with `GROQ_API_KEY`

**Impact**: One less API key to manage, one less vendor dependency, same model family across all AI features.
