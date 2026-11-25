# IS-F21: Assessment Tokens Use Predictable cuid()

**Status:** ✅ Fixed
**Severity:** 🔧 Code Quality
**Source:** AUDIT_REPORT.md #30
**Fixed:** May 2026

## Issue
Assessment `sessionToken` in Prisma schema used `@default(cuid())` — structurally predictable (timestamp + counter + fingerprint). For one-time access tokens, cryptographically random values are more secure.

## Fix
Replaced with `crypto.randomBytes(32).toString('hex')` in both schema default and send route.
