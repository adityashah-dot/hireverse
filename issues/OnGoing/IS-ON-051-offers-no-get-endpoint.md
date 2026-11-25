# IS-ON-051: Offers — No GET/Listing Endpoint

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Half-Baked
**Source:** CODEBASE_AUDIT_2026-05-23.md (cross-reference)
**Component:** `app/api/offers/`
**Phase:** Phase 4 — Backlog

## Issue
`POST /api/offers` sends an offer letter via email, but there's no `GET /api/offers` to list offers, and no `GET /api/offers/[id]` to retrieve a specific offer. Offers are ephemeral — sent via email, tracked in ActivityLog, but not queryable. A recruiter can't see offer history.

## Fix
Add GET endpoints for offer listing and retrieval. Consider adding an `Offer` model to Prisma for persistence.
