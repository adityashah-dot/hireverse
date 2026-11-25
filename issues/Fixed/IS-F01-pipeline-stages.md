# IS-F01: Pipeline Page Stage Mismatch

**Status:** ✅ Fixed
**Severity:** 🔴 Critical
**Source:** AUDIT_REPORT.md #1
**Fixed:** May 2026

## Issue
Pipeline Kanban board used 6 lowercase stage names (`applied → shortlisted → assessment → interview → offer → hired`) while Prisma `CandidateStage` enum has 9 uppercase values. Missing stages: `SCREENING`, `ASSESSMENT_DONE`, `REJECTED`.

## Fix
Pipeline now uses all 9 Prisma `CandidateStage` enum values. All stages displayed on the Kanban board. "Rejected" column has a show/hide toggle. Stage mapping aligns with Prisma schema.
