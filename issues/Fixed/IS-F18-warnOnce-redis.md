# IS-F18: Warning Spam on Redis Outage

**Status:** ✅ Fixed
**Severity:** 🔧 Code Quality
**Source:** AUDIT_REPORT.md #33
**Fixed:** May 2026

## Issue
Every call to `queueResumeProcessing()`, `queueEmail()`, or `queueAssessmentGeneration()` logged a `console.warn` when Redis was down. During an outage, this could generate thousands of warnings.

## Fix
`warnOnce()` pattern — each queue warns exactly once per process lifetime.
