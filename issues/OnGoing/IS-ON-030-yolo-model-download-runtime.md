# IS-ON-030: YOLO Model Downloaded at Runtime

**Status:** 🔵 OnGoing
**Severity:** 🔵 Minor — DevOps
**Source:** CODEBASE_AUDIT_2026-05-23.md #29
**Component:** `ai-interview-service/main.py`
**Phase:** Phase 4 — Backlog

## Issue
```python
_yolo_model = YOLO("yolov8n-pose.pt")
```
Downloads ~6MB on first run. If the service has no internet access in production, it crashes. The model file should be committed or downloaded in a build step.

## Fix
Add model download to Docker build step or commit the model file.
