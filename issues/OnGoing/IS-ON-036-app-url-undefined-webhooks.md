# IS-ON-036: APP_URL Undefined in Webhook Action URLs

**Status:** 🔴 OnGoing
**Severity:** 🔴 Critical — Broken Feature
**Source:** CODEBASE_AUDIT_2026-05-23.md #36
**Component:** `lib/webhook.ts`
**Phase:** Phase 2 — This Week

## Issue
```typescript
actionUrl: `${process.env.APP_URL}/candidates/${params.candidateId}`
```
`APP_URL` is not in `.env.example` minimum requirements and is not set. Resolves to `"undefined/candidates/..."` — all Slack/Teams webhook notification links are broken.

## Fix
Add `APP_URL` to `.env` and `.env.example`. Or derive from `NEXTAUTH_URL` as fallback.
