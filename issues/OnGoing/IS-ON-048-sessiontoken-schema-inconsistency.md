# IS-ON-048: Assessment sessionToken Schema vs Code Inconsistency

**Status:** 🟢 OnGoing
**Severity:** 🟢 Low — Documentation
**Source:** CODEBASE_AUDIT_2026-05-23.md #49
**Component:** `prisma/schema.prisma`, `app/api/assessments/send/route.ts`
**Phase:** Phase 4 — Backlog

## Issue
Schema defines `sessionToken` with `@default(cuid())`, but the send route generates via `crypto.randomBytes(32).toString('hex')`. The Prisma default is never actually used because the route always provides a value. This is confusing for new developers.

## Fix
Remove `@default(cuid())` from the schema since it's always overridden, or add a comment explaining the override.
