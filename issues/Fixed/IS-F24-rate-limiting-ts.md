# IS-F24: API Rate Limiting — TypeScript Side

**Status:** ✅ Fixed (TypeScript only)
**Severity:** 🟠 Missing Feature
**Source:** AUDIT_REPORT.md #17
**Fixed:** May 2026

## Issue
No rate limiting existed despite the PRD specifying 100 req/min.

## Fix
`lib/rate-limit.ts` — in-memory rate limiter. Applied to register (10/15min), public apply (20/min), assessment submit (10/min). Rate limit headers on responses. Note: Python service has zero rate limiting (see IS-ON-021).
