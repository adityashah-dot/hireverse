# IS-F10: No Duplicate Candidate Detection Across Jobs

**Status:** ✅ Fixed
**Severity:** 🟠 Missing Feature
**Source:** AUDIT_REPORT.md #21
**Fixed:** May 2026

## Issue
Only `email + jobId` unique constraint existed. Same person applying to different jobs at the same company created separate records with no deduplication.

## Fix
Cross-job email dedup check on public apply and manual candidate creation. Duplicates flagged in activity log.
