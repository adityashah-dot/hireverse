# IS-ON-035: Bulk CSV Import Always Passes Empty jobId

**Status:** 🔴 OnGoing
**Severity:** 🔴 Critical — Broken Feature
**Source:** CODEBASE_AUDIT_2026-05-23.md #35
**Component:** `app/(dashboard)/bulk-actions/page.tsx`
**Phase:** Phase 2 — This Week

## Issue
```typescript
formData.append('jobId', filterStage !== 'all' ? '' : '')
```
Ternary logic is inverted — always passes empty string. The CSV import API at `app/api/candidates/csv/route.ts` requires `jobId` and returns 400 if missing. CSV import is always broken.

## Fix
Correct the ternary: `filterStage === 'all' ? '' : filterStage`. Or better yet, get `jobId` from the selected job rather than the filter stage.
