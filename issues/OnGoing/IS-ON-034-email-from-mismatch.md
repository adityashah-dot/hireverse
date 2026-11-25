# IS-ON-034: EMAIL_FROM Mismatch With Gmail SMTP Auth

**Status:** 🔴 OnGoing
**Severity:** 🔴 Critical — Broken Feature
**Source:** CODEBASE_AUDIT_2026-05-23.md #34
**Component:** `lib/email.ts`, `.env`
**Phase:** Phase 2 — This Week

## Issue
Gmail SMTP requires the `from` address to match the authenticated Gmail account. `.env` has:
```
EMAIL_FROM="HireVerse <noreply@hireverse.com>"
GMAIL_USER="kumarpankajsingh700@gmail.com"
```
Gmail will reject mail sent `from: noreply@hireverse.com` when authenticated as `kumarpankajsingh700@gmail.com`. All emails silently fail in production.

## Fix
Set `EMAIL_FROM` to match `GMAIL_USER`, or use Resend/another email provider that allows custom from addresses.
