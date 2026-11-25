# IS-ON-044: No Dead-Letter Queue for BullMQ

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Reliability
**Source:** CODEBASE_AUDIT_2026-05-23.md #44
**Component:** `lib/queue/index.ts`, `lib/queue/worker.ts`
**Phase:** Phase 3 — This Sprint

## Issue
BullMQ supports dead-letter queues for failed jobs that exhaust retries. None are configured. Failed resume processing, email sending, and assessment generation jobs are silently lost after retry exhaustion. No visibility into what failed or why.

## Fix
Configure a dead-letter queue in BullMQ. Log failed jobs for manual inspection and replay.
