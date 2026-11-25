# IS-F06: No Offer Letter Generation Flow

**Status:** ✅ Fixed
**Severity:** 🟡 Half-Baked
**Source:** AUDIT_REPORT.md #10
**Fixed:** May 2026

## Issue
Candidates could reach `OFFER` stage but there was no offer letter template, digital acceptance, or onboarding workflow. Only manual stage changes existed.

## Fix
`POST /api/offers` endpoint sends `offerLetterHtml` via email with salary, start date, employment type. Offer letters are tracked in ActivityLog. No GET/listing endpoint yet (see IS-OnGoing).
