# IS-F20: Interview Deletion on AI Pre-Generation Failure

**Status:** ✅ Fixed
**Severity:** 🟡 Half-Baked
**Source:** AUDIT_REPORT.md #28
**Fixed:** May 2026

## Issue
If AI question pre-generation failed (Python service non-2xx), the handler deleted the entire interview via `prisma.interview.delete` and returned 502. Recruiter lost all interview setup work.

## Fix
Failure now logs to interview notes and continues. Interview is created with fallback questions instead of being deleted.
