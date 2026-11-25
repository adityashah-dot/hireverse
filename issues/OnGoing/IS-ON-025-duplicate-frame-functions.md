# IS-ON-025: Duplicate Frame Capture Functions

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Code Quality
**Source:** CODEBASE_AUDIT_2026-05-23.md #15
**Component:** `ai-interview-service/main.py`
**Phase:** Phase 3 — This Sprint

## Issue
`capture_frame()` and `process_eye_frame()` both decode base64 frames and save to disk. `process_eye_frame` additionally runs YOLO. These should be consolidated into one function with a parameter to control YOLO analysis.

Also, `capture_frame()` uses a file-based counter with race conditions while `process_eye_frame()` uses a session-based counter.

## Fix
Consolidate into a single function. Use session-based counter everywhere.
