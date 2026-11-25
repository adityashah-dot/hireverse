# IS-F07: No OAuth Providers — Credentials-Only Login

**Status:** ✅ Fixed
**Severity:** 🟠 Missing Feature
**Source:** AUDIT_REPORT.md #16
**Fixed:** May 2026

## Issue
NextAuth was configured with only `CredentialsProvider`. No Google, GitHub, or Microsoft OAuth login.

## Fix
Google and GitHub OAuth providers added to `lib/auth.ts` with auto-provisioning (creates company + user on first login). Sign-in page has provider buttons. Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_ID`, `GITHUB_SECRET` env vars to be functional — currently not set in `.env`.
