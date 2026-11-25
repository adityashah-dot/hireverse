# IS-F12: Department Filtering — UI Only

**Status:** ✅ Fixed
**Severity:** 🟠 Missing Feature
**Source:** AUDIT_REPORT.md #23
**Fixed:** May 2026

## Issue
AppShell department dropdown was cosmetic — selecting a department didn't filter anything. No backend filtering by department existed.

## Fix
AppShell department dropdown wired to URL params. Candidates API filters by `department` query param. Department filter now functional.
