# IS-F27: Authentication Added to Python Service Endpoints

**Status:** ✅ Fixed
**Severity:** 🔴 Critical — Security
**Source:** CODEBASE_AUDIT_2026-05-23.md #2
**Fixed:** 2026-05-23

## Issue
All 12 endpoints in the Python FastAPI service were completely unauthenticated. Anyone who discovered the service could create unlimited sessions, submit fake answers, and burn Groq API credits.

## Fix
1. Added `AI_SERVICE_AUTH_SECRET` to `config.py` — reads from environment variable
2. Added `verify_service_auth()` dependency function in `main.py`:
   - Extracts `Authorization: Bearer <token>` header
   - Validates against `AI_SERVICE_AUTH_SECRET`
   - Skips auth if no secret is configured (dev fallback)
   - Health check endpoint (`/health`) is exempt
3. Applied `Depends(verify_service_auth)` to all 10 protected endpoints:
   - `/api/interview/pregenerate`
   - `/api/interview/start`
   - `/api/interview/transcribe`
   - `/api/interview/answer`
   - `/api/interview/end`
   - `/api/interview/{session_id}/status`
   - `/api/eye-detection/frame`
   - `/api/violations/log`
   - `/api/violation/log`
   - `/api/frames/capture`
4. Updated Next.js proxy to forward `Authorization: Bearer <AI_SERVICE_AUTH_SECRET>` to Python service
5. Added `AI_SERVICE_AUTH_SECRET` to both `.env` files and `.env.example` files
