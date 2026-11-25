# IS-ON-040: Reports Page — Department Filter Is Cosmetic

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Half-Baked
**Source:** CODEBASE_AUDIT_2026-05-23.md #40
**Component:** `app/(dashboard)/reports/page.tsx`
**Phase:** Phase 4 — Backlog

## Issue
Department dropdown has 4 fixed values (engineering, design, marketing, sales) but `analyticsApi.dashboard()` doesn't accept a department parameter. Changing the filter updates the UI but doesn't filter any data.

**Note:** AUDIT_REPORT.md claimed CSV export was fixed, but the department filter aspect is still cosmetic.

## Fix
Add department filtering to the analytics API, or remove the cosmetic dropdown.
