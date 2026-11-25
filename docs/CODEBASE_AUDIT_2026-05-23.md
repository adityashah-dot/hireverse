# HireVerse — Codebase Audit Report

**Date:** 2026-05-23
**Scope:** Full codebase + `ai-interview-service/` microservice
**Method:** Manual review of all Python files, all API routes, Prisma schema, lib files, dashboard pages, config, middleware, Docker, and documentation

---

## 🔴 CRITICAL: `ai-interview-service/` — Security & Data Loss

### 1. Live Groq API Key in Repo
**File:** `ai-interview-service/.env` line 1
**Risk:** API key abuse, billing compromise
```
GROQ_API_KEY=gsk_placeholder_groq_key
```
The `.env` file contains a real Groq API key. Must be rotated immediately and the file added to `.gitignore`.

### 2. Zero Authentication on All 12 Endpoints
**File:** `ai-interview-service/main.py`
**Risk:** Anyone can burn Groq credits, create sessions, submit fake answers
Every endpoint (`/start`, `/transcribe`, `/answer`, `/end`, `/eye-detection/frame`, etc.) is completely unauthenticated. The only barrier is CORS — a browser feature, not server-side security.

### 3. Race Condition — Non-Atomic Session File Writes
**File:** `ai-interview-service/main.py` — `_save_session()`
**Risk:** Silent data loss under concurrent requests
```python
_session_file(session_id).write_text(
    json.dumps(session, default=str), encoding="utf-8"
)
```
Direct file write with no locking, no atomic write-then-rename. Two simultaneous requests (e.g., frame capture + answer submission) silently overwrite each other.

**Fix:** Write to temp file, then `os.replace(tmp_path, target_path)`.

### 4. `random.seed()` Corrupts Global RNG State
**File:** `ai-interview-service/question_engine.py` — `choose_next_question()`
**Risk:** Concurrent sessions fight over the same RNG; determinism breaks
```python
random.seed(seed)
return random.choice(available)
```
Mutates the global `random` module state. Two concurrent sessions race on seed/choice. After this call, all subsequent `random.*` calls anywhere in the process become predictable.

**Fix:** Use `random.Random(seed).choice(available)` — a local instance.

### 5. Blocking Sync Calls in Async Endpoints
**File:** `ai-interview-service/main.py`
**Risk:** Event loop blocked during I/O and ML inference
- `transcribe_audio()`: `remote_whisper_client.transcribe_file()` — sync HTTP call blocks event loop for seconds
- `finalize_interview_background()`: `cv2.imread()` + `analyze_frame_yolo()` — sync I/O + YOLO inference blocks event loop

**Fix:** Wrap in `asyncio.to_thread()` or `loop.run_in_executor()`.

### 6. `load_dotenv()` With No Explicit Path
**File:** `ai-interview-service/main.py` line 35
```python
load_dotenv()
```
Searches CWD and parents for `.env`. If the service starts from a different directory, it silently loads nothing. Groq clients in `utils.py` and `whisper_client.py` initialize at import time — with empty API keys, every call fails.

**Fix:** `load_dotenv(Path(__file__).parent / ".env")`

### 7. Session Not Persisted After Question Advancement
**File:** `ai-interview-service/main.py` — `process_answer()`
**Risk:** Crash between questions = candidate repeats the same question
```python
_save_session(response.session_id)     # saved BEFORE advancement
# ... question advancement ...
# ⚠️ _save_session NOT called after this!
```
If the server crashes after advancing to the next question but before the next request arrives, the session file has stale state. On resume, candidate gets the same question again.

### 8. Non-Atomic Violation Log Writes
**File:** `ai-interview-service/main.py` — `log_violation()`
**Risk:** Concurrent violation logs silently overwrite each other
```python
existing = json.loads(vfile.read_text())  # read
existing.append(violation_data)
vfile.write_text(json.dumps(existing))    # write
```
Read-modify-write cycle with no locking. Two simultaneous logs → one overwrites the other.

### 9. TOCTOU Race in Frame Counter
**File:** `ai-interview-service/main.py` — `capture_frame()`
**Risk:** Lost frame numbers, potential frame file overwrites
```python
count = int(counter_file.read_text()) + 1 if counter_file.exists() else 1
counter_file.write_text(str(count))
```
Classic time-of-check-to-time-of-use. Two simultaneous captures read the same count, both write `count+1`.

---

## 🟠 MAJOR: `ai-interview-service/` — Bugs & Design Issues

### 10. `get_remaining_minutes()` Ignores Session Time Limit
**File:** `ai-interview-service/main.py`
Always uses `config.INTERVIEW_TIME_LIMIT_MINUTES` (30) regardless of session's own `time_limit_minutes`. Custom-duration interviews show wrong remaining time.

### 11. Datetime Fields Not Restored on Session Load
**File:** `ai-interview-service/main.py` — `_load_session()`
Only restores `created_at` and `interview_timer_started` from ISO strings. `start_time` and `end_time` stored as strings but never converted back to datetime.

### 12. Non-Atomic In-Memory Frame Counter
**File:** `ai-interview-service/main.py` — `process_eye_frame()`
```python
frame_count = live_session.get("_frame_count", 0) + 1
live_session["_frame_count"] = frame_count
```
FastAPI handles requests concurrently. Two frames arriving simultaneously both read the same `_frame_count`.

### 13. Dead Config Values
**File:** `ai-interview-service/config.py`
- `MIN_GOOD_ANSWER_WORDS = 10` — defined but never referenced anywhere
- `AI_INTERVIEW_PASS_THRESHOLD` — defined but unused; `calculate_final_score()` has its own hardcoded thresholds
- `GROQ_LLM_MODEL` and `GROQ_WHISPER_MODEL` — defined but ignored; model strings are hardcoded in `utils.py` and `whisper_client.py`

### 14. `_ensure_question_shape()` Mutates Input In-Place
**File:** `ai-interview-service/main.py`
Mutates the caller's list with `q.setdefault()`. Every caller works around this by passing a copy, but it's a latent footgun.

### 15. `capture_frame()` and `process_eye_frame()` Are Duplicates
**File:** `ai-interview-service/main.py`
Both decode base64 frames and save to disk. `process_eye_frame` additionally runs YOLO. Should be consolidated.

### 16. `_SIGNAL_TO_VIOLATION` Dict Defined Inside Endpoint
**File:** `ai-interview-service/main.py` — `process_eye_frame()`
Recreated on every frame processing call. Should be a module-level constant.

---

## 🟡 MEDIUM: `ai-interview-service/` — Half-Baked & Missing

### 17. No Webhook Retry
**File:** `ai-interview-service/main.py` — `_call_hireverse_webhook()`
If Next.js is down when interview completes, results are saved only to local JSON. No retry queue, no dead-letter mechanism, no exponential backoff.

### 18. No Graceful Shutdown
**File:** `ai-interview-service/main.py`
No `@app.on_event("shutdown")` handler. On SIGTERM: in-memory sessions lost, cleanup daemon thread dies abruptly, in-flight Groq API calls abandoned.

### 19. Zero Tests
Not a single Python test file exists in `ai-interview-service/`. The `tests/` directory at project root contains only TypeScript tests.

### 20. No Dockerfile for Python Service
`docker-compose.yml` only defines Redis. No `Dockerfile`, no `start.sh` (only Windows `start.bat`). Full system requires 4 terminals to run locally.

### 21. No Rate Limiting
No protection against flooding `/eye-detection/frame` (runs YOLO on every frame) or `/transcribe` (costs Groq credits).

### 22. `print()` Instead of Structured Logging
Every error, warning, and info message uses `print()`. No log levels, timestamps, rotation, or structured output.

### 23. Hardcoded Model Strings
`config.GROQ_LLM_MODEL` and `config.GROQ_WHISPER_MODEL` exist but are ignored. `utils.py` and `whisper_client.py` hardcode `"llama-3.3-70b-versatile"` and `"whisper-large-v3"`.

### 24. Exception Details Leaked to Clients
```python
raise HTTPException(status_code=500, detail=str(e))
```
Raw exception messages (including file paths, library internals) sent to API clients.

### 25. Unbounded Storage Growth
- `active_sessions` dict: no size cap
- `eye_logs/`: frame captures never cleaned up
- `sessions/`: only expired sessions cleaned (24h window)
- `results/`: JSON files accumulate forever
- `violations/`: JSON files accumulate forever

### 26. No Input Validation on Candidate Answers
Answers pass directly into the LLM prompt with no sanitization or length limit. Extremely long answers could exceed Groq token limits or cause high API costs.

### 27. Aggressive Difficulty Jumps
**File:** `ai-interview-service/utils.py` — `update_difficulty()`
A candidate who aces one easy question jumps directly from "easy" to "hard" (skipping "medium"). Probably a design smell.

### 28. `clean_transcript()` Uses `str.count()` Instead of Word Detection
```python
if lower.count(h) >= 2 and len(text.split()) < 15:
```
`str.count()` counts substring occurrences, not words. `"goodbye"` in `"goodbyegoodbye"` counts twice. Practically unlikely but technically incorrect.

### 29. YOLO Model Not in Repo
**File:** `ai-interview-service/main.py`
```python
_yolo_model = YOLO("yolov8n-pose.pt")
```
Downloads ~6MB on first run. If the service has no internet in production, it crashes.

### 30. Dead Dependency
**File:** `ai-interview-service/requirements.txt`
`pytz==2024.1` — listed but never imported anywhere.

### 31. Inconsistent Error Response Formats
`process_eye_frame` returns `{"status": "error", ...}` on failure instead of raising `HTTPException`. Other endpoints raise `HTTPException`.

---

## 🔴 CRITICAL: Codebase-Wide — Broken Features

### 32. `OPENAI_API_KEY` Missing from `.env`
**File:** `.env`, `lib/ai/generate-questions.ts`
The `.env` has `GROQ_API_KEY` but no `OPENAI_API_KEY`. The `generateQuestions()` function uses `getOpenAI()` which throws when `OPENAI_API_KEY` is absent. The assessment-generation worker will crash when a job arrives.

### 33. `InterviewType` Zod Schema Rejects `AI_VOICE`
**File:** `app/api/interviews/route.ts`
```typescript
type: z.enum(['PHONE_SCREEN', 'VIDEO', 'ONSITE', 'TECHNICAL', 'BEHAVIORAL', 'FINAL']),
```
Prisma schema defines 7 `InterviewType` values including `AI_VOICE`. The Zod validation only allows 6. Sending `AI_VOICE` from a client returns 400.

### 34. `EMAIL_FROM` Mismatch With Gmail SMTP Auth
**File:** `lib/email.ts`, `.env`
Gmail SMTP requires the `from` address to match the authenticated Gmail account. `.env` has:
```
EMAIL_FROM="HireVerse <noreply@hireverse.com>"
GMAIL_USER="kumarpankajsingh700@gmail.com"
```
Gmail will reject mail sent `from: noreply@hireverse.com` when authenticated as `kumarpankajsingh700@gmail.com`. Emails silently fail.

### 35. Bulk CSV Import Always Passes Empty `jobId`
**File:** `app/(dashboard)/bulk-actions/page.tsx`
```typescript
formData.append('jobId', filterStage !== 'all' ? '' : '')
```
Ternary logic is inverted — always passes empty string. The CSV import API requires `jobId` and returns 400 if missing. CSV import is always broken.

### 36. `APP_URL` Undefined in Webhook Action URLs
**File:** `lib/webhook.ts`
```typescript
actionUrl: `${process.env.APP_URL}/candidates/${params.candidateId}`
```
`APP_URL` is not in `.env.example` minimum requirements. Resolves to `"undefined/candidates/..."` — Slack/Teams notification links are broken.

### 37. Worker Creates Eager Redis Connection at Module Level
**File:** `lib/queue/worker.ts`
```typescript
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', ...)
```
Top-level instantiation. If Redis is down when the worker module imports, it crashes immediately. Compare to `lib/queue/index.ts` which uses try/catch and sets connection to `null`.

### 38. Assessment-Generation Worker Bypasses Email Queue
**File:** `lib/queue/worker.ts`
The assessment-generation worker calls `sendEmail()` directly instead of queuing via `emailQueue`. This means: no retry if email fails, blocks the worker during sending, and bypasses the `email-sending` worker entirely.

---

## 🟡 MEDIUM: Codebase-Wide — Half-Baked Features

### 39. AI Insights Page — Fabricated Metrics
**File:** `app/(dashboard)/ai-insights/page.tsx`
```typescript
timeSaved: `${Math.min(8 + candidates.length * 0.3, 40).toFixed(0)} hrs`,
qualityScore: `+${Math.min(10 + Math.floor(candidates.length / 5), 30)}%`,
accuracy: `${Math.min(80 + Math.floor(candidates.length / 10), 95)}%`,
```
These metrics are fabricated from `candidates.length` and have no connection to any real AI performance measurement. The "Configure AI" button has no handler.

### 40. Reports Page — Department Filter Is Cosmetic
**File:** `app/(dashboard)/reports/page.tsx`
Department dropdown with 4 fixed values (engineering, design, marketing, sales) — but `analyticsApi.dashboard()` doesn't accept a department parameter. Filter changes the UI but doesn't filter data.

### 41. Send Reminder Button — Non-Functional Placeholder
**File:** `app/(dashboard)/interviews/page.tsx`
```typescript
toast({ title: "Reminder queued", description: `Email reminder will be sent to ${getName(interview)} (requires RESEND_API_KEY)` })
```
Shows a toast but never calls an API or queues an email. Comment says `(requires RESEND_API_KEY)` — it's a placeholder.

### 42. Email Templates — UX Issues
**File:** `app/(dashboard)/email-templates/page.tsx`
```typescript
setTemplates([...DEFAULT_TEMPLATES, ...fetched])
```
User's saved templates always shown AFTER hardcoded defaults. Initial selection defaults to `DEFAULT_TEMPLATES[0]` even if the API returned user-created templates. Defaults have IDs like `default-1`, `default-2` — can't actually be saved.

### 43. Interview Pre-Generation Silent Fallback
**File:** `app/api/interviews/route.ts`
When AI question pre-generation via Groq fails, the code logs and sends the email anyway. The candidate gets 27 generic fallback questions from `question_engine.py`. The recruiter gets no visual indication that tailored questions failed.

### 44. No Dead-Letter Queue for BullMQ
**File:** `lib/queue/index.ts`, `lib/queue/worker.ts`
BullMQ supports dead-letter queues for failed jobs that exhaust retries. None configured. Failed resume processing, email sending, and assessment generation are silently lost.

### 45. No Prisma Migrations Directory
**File:** `prisma/`
No `migrations/` directory. Project relies on `prisma db push` — acceptable for development, unsafe for production (schema drift risk).

---

## 🟢 LOW: Documentation & Contract Issues

### 46. Docs Claim PlanetScale — Actual Stack Is Supabase
Multiple docs (`PRD.md`, `CLAUDE.md`) reference PlanetScale as the database provider. Actual configuration uses Supabase.

### 47. Docs Claim OpenAI GPT-4 — Actual Model Is `gpt-4o-mini`
`CLAUDE.md` states "OpenAI GPT-4" for question generation. Actual model in `generate-questions.ts` is `gpt-4o-mini`.

### 48. `.env.example` Missing Several Required Variables
Missing: `GROQ_API_KEY`, `AI_INTERVIEW_SERVICE_URL`, `AI_INTERVIEW_WEBHOOK_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`. Developers following `.env.example` alone can't run the AI interview service or resume parsing.

### 49. Assessment `sessionToken` — Schema vs Code Inconsistency
**Schema:** `sessionToken` has `@default(cuid())`
**Code:** `app/api/assessments/send/route.ts` generates via `crypto.randomBytes(32).toString('hex')`
The route correctly overrides the Prisma default (cryptographically random tokens are better than cuid), but the `@default(cuid())` is never actually used. Confusing for new developers.

### 50. Timer Discrepancy Across Services
- Next.js access window: ±10 minutes from scheduled time
- Python session expiry: 24 hours
- Python interview time limit: 30 minutes
Three different time windows governing the interview lifecycle with no unified configuration source.

### 51. OAuth Providers Configured but Untestable
**File:** `lib/auth.ts`
Google and GitHub OAuth providers are in `lib/auth.ts` with conditional enablement, but `.env` has no `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_ID`, or `GITHUB_SECRET`. Only credentials login works.

### 52. AI Interview Webhook Secret Is Default Value
**File:** `.env`
```
AI_INTERVIEW_WEBHOOK_SECRET="ai-interview-secret-change-me"
```
The default value from code is used. Should be rotated to a strong random string.

### 53. CSRF Middleware Bypasses Requests Without Origin/Referer
**File:** `middleware.ts`
```typescript
if (!origin && !refererOrigin) return { valid: true }
```
Any request without Origin/Referer headers (curl, Postman, native apps) bypasses CSRF entirely. Intended for server-to-server calls but weakens security posture.

---

## ✅ Confirmed Working

| Area | Status |
|------|--------|
| Prisma schema — 19 models, well-indexed, clean relations | Solid |
| All 48 API routes — properly structured, Zod-validated | Solid |
| Auth system — JWT-based, role enforcement, CSRF protection | Good |
| NextAuth type declarations (`types/next-auth.d.ts`) | Correct |
| GDPR endpoints (`GET/DELETE /api/candidates/[id]/gdpr`) | Implemented |
| Offer letter flow (`POST /api/offers`) | Implemented |
| CSV import/export (`GET/POST /api/candidates/csv`) | Implemented |
| Application status page (`/application-status`) | Implemented |
| Rate limiting (`lib/rate-limit.ts` — register, apply, submit) | Implemented |
| Structured logger (`lib/logger.ts`) | Implemented |
| Slack/Teams webhooks (`lib/webhook.ts`) | Implemented |
| i18n with 5 languages (`lib/i18n.tsx`, `locales/`) | Implemented |
| Password change endpoint for authenticated users | Implemented |
| 13 unit tests (CSRF, rate-limit, logger) | Implemented |
| `.nvmrc` with Node 22 | Added |
| Pipeline page uses all 9 CandidateStage values | Fixed from prior audit |
| AI interview proxy forwards all POST bodies correctly | Fixed from prior audit |
| Assessment PREPARING state shows waiting message | Fixed |
| Resume parsing uses queue (async, non-blocking) | Fixed |
| Worker warns once per Redis outage | Fixed |

---

## Fix Priority Roadmap

### Phase 1 — Immediate (Security & Data Loss)
1. Rotate all secrets in `.env`, add `.env` to `.gitignore`
2. Add `OPENAI_API_KEY` to `.env`
3. Add shared-secret auth to Python service endpoints
4. Fix non-atomic file writes in `_save_session()`, `log_violation()`, frame counter
5. Fix `random.seed()` mutating global state → use `random.Random(seed)` instance
6. Wrap blocking calls in `asyncio.to_thread()`

### Phase 2 — This Week (Broken Features)
7. Fix `InterviewType` Zod schema to include `AI_VOICE`
8. Fix `EMAIL_FROM` to match Gmail auth user
9. Fix CSV import `jobId` ternary logic
10. Fix `APP_URL` fallback in webhook URLs
11. Add webhook retry with exponential backoff to Python service

### Phase 3 — This Sprint (Polish)
12. Wire AI Insights to real API data
13. Replace `print()` with structured logging in Python service
14. Add Dockerfile for Python service + include in `docker-compose.yml`
15. Add rate limiting to Python endpoints
16. Add storage cleanup for `eye_logs/`, `results/`, `violations/`
17. Add dead-letter queue to BullMQ configuration
18. Create proper Prisma migrations for production

### Phase 4 — Backlog (Nice-to-Have)
19. Add Python test suite
20. Fix email templates UX (re-order, editable defaults)
21. Implement Send Reminder button
22. Add department filtering to reports
23. Update docs to reflect actual stack (Supabase, gpt-4o-mini)
24. Rotate `AI_INTERVIEW_WEBHOOK_SECRET` from default
25. Unify timer configuration across services
26. Add OAuth credentials for Google/GitHub login
