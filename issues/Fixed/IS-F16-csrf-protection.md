# IS-F16: No CSRF Protection on API Routes

**Status:** ✅ Fixed
**Severity:** 🔧 Code Quality
**Source:** AUDIT_REPORT.md #31
**Fixed:** May 2026

## Issue
Next.js App Router route handlers had no CSRF protection. Assessment submission and candidate apply endpoints accepted POST with no CSRF token validation.

## Fix
`lib/csrf.ts` — Origin/Referer validation integrated into middleware for all state-changing requests.
