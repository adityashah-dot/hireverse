# IS-F15: Browser Fingerprint Uses MD5

**Status:** ✅ Fixed
**Severity:** 🔧 Code Quality
**Source:** AUDIT_REPORT.md #29
**Fixed:** May 2026

## Issue
Browser fingerprint for assessment security used MD5 hashing (cryptographically broken).

## Fix
SHA256 now in use in both Next.js and Python service for browser fingerprint hashing.
