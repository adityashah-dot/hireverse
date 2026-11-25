# IS-ON-041: Send Reminder Button — Non-Functional Placeholder

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Half-Baked
**Source:** CODEBASE_AUDIT_2026-05-23.md #41
**Component:** `app/(dashboard)/interviews/page.tsx`
**Phase:** Phase 4 — Backlog

## Issue
```typescript
toast({ title: "Reminder queued", description: `Email reminder will be sent to ${getName(interview)} (requires RESEND_API_KEY)` })
```
Shows a toast but never calls an API or queues an email. The comment says `(requires RESEND_API_KEY)` — it's a placeholder, not a real feature.

## Fix
Wire up to the email queue system. Or remove the button until implemented.
