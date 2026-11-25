# IS-ON-045: No Prisma Migrations Directory

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — DevOps
**Source:** CODEBASE_AUDIT_2026-05-23.md #45
**Component:** `prisma/`
**Phase:** Phase 3 — This Sprint

## Issue
No `migrations/` directory exists. Project relies on `prisma db push` for schema changes. This is acceptable for development but unsafe for production — schema drift can occur, and there's no versioned migration history.

## Fix
Run `prisma migrate dev` to generate initial migration. Use migrations going forward instead of `db push` for production environments.
