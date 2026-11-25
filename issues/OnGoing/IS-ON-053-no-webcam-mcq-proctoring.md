# IS-ON-053: No Webcam Proctoring on MCQ Assessments

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Feature Gap
**Source:** CODEBASE_AUDIT_2026-05-23.md (cross-reference)
**Component:** `app/(assessment)/assessment/[sessionId]/`
**Phase:** Phase 4 — Backlog

## Issue
MCQ assessments only have tab-switch counting for proctoring. No webcam feed, screen recording, or gaze tracking. The AI interview service has YOLOv8 eye-tracking, but MCQ assessments (the primary assessment type) have no proctoring beyond tab counting.

**Note:** AUDIT_REPORT.md #19 claims "periodic snapshots during assessment" — the MCQ assessment only has a camera preview on the pre-start screen, not during the actual assessment.

## Fix
Add periodic webcam snapshots during MCQ assessments, or integrate the Python service's eye-tracking.
