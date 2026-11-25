# IS-F09: No Slack/Microsoft Teams Integration

**Status:** ✅ Fixed
**Severity:** 🟠 Missing Feature
**Source:** AUDIT_REPORT.md #20
**Fixed:** May 2026

## Issue
No Slack or Teams notification integration existed despite being listed in the PRD roadmap.

## Fix
`lib/webhook.ts` — rich card notifications for new applications, assessment completed, offers, and interviews. Slack and Teams webhook support wired into apply and submit routes. Note: `APP_URL` env var needed for action links to work (see IS-ON-036).
