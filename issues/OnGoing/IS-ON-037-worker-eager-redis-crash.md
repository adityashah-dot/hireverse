# IS-ON-037: Worker Eager Redis Connection Crashes on Startup

**Status:** 🔴 OnGoing
**Severity:** 🔴 Critical — Reliability
**Source:** CODEBASE_AUDIT_2026-05-23.md #37
**Component:** `lib/queue/worker.ts`
**Phase:** Phase 2 — This Week

## Issue
```typescript
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', ...)
```
Top-level instantiation. If Redis is down when the worker module is imported (e.g., at `npm run worker` startup), it throws immediately, crashing the worker process. Compare to `lib/queue/index.ts` which uses try/catch and sets connection to `null`.

## Fix
Make the worker connection lazy with try/catch, or retry on startup failure.
