# IS-F13: No GDPR Data Export/Deletion Tools

**Status:** ✅ Fixed
**Severity:** 🟠 Missing Feature
**Source:** AUDIT_REPORT.md #25
**Fixed:** May 2026

## Issue
No GDPR data export or right-to-deletion endpoints existed despite being described in the QA Guide.

## Fix
`GET /api/candidates/[id]/gdpr` — full data export as JSON. `DELETE /api/candidates/[id]/gdpr` — permanent deletion with anonymization.
