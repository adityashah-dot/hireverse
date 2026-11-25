# IS-ON-033: InterviewType Zod Schema Rejects AI_VOICE

**Status:** 🔴 OnGoing
**Severity:** 🔴 Critical — Broken Feature
**Source:** CODEBASE_AUDIT_2026-05-23.md #33
**Component:** `app/api/interviews/route.ts`
**Phase:** Phase 2 — This Week

## Issue
```typescript
type: z.enum(['PHONE_SCREEN', 'VIDEO', 'ONSITE', 'TECHNICAL', 'BEHAVIORAL', 'FINAL']),
```
Prisma `InterviewType` enum has 7 values including `AI_VOICE`. The Zod validation only allows 6. Sending `AI_VOICE` from a client returns 400. The code treats all interviews as AI interviews anyway (line 222 comment), creating a confusing mismatch.

## Fix
Add `AI_VOICE` to the Zod enum. If all interviews are AI, consider consolidating the enum or making the type explicit.
