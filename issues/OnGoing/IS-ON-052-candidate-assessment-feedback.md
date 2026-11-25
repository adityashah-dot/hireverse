# IS-ON-052: No Candidate Feedback on MCQ Assessments

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Feature Gap
**Source:** CODEBASE_AUDIT_2026-05-23.md (cross-reference)
**Component:** `app/api/assessments/[sessionToken]/submit/route.ts`
**Phase:** Phase 4 — Backlog

## Issue
Candidates complete MCQ assessments but never receive automated feedback unless a recruiter manually emails them. The `assessmentResultCandidateHtml` email template exists and can be queued, but it needs to be wired into the assessment submission flow.

**Note:** AUDIT_REPORT.md #24 claims this is "sent automatically on assessment completion via worker" — verify if actually wired.

## Fix
Wire the `assessment-result-candidate` email queue call into the assessment submission route.
