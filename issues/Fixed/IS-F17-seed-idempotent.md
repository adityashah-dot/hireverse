# IS-F17: Seed Script Not Idempotent

**Status:** ✅ Fixed
**Severity:** 🔧 Code Quality
**Source:** AUDIT_REPORT.md #32
**Fixed:** May 2026

## Issue
Running `prisma:seed` twice created duplicate jobs and candidates (only Company used `upsert`).

## Fix
Seed now uses `upsert` everywhere with `skipDuplicates`. Safely re-runnable.
