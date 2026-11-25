# IS-F30: Blocking Sync Calls in Async Endpoints

**Status:** ✅ Fixed
**Severity:** 🔴 Critical — Performance
**Source:** CODEBASE_AUDIT_2026-05-23.md #5
**Fixed:** 2026-05-23

## Issue
Multiple sync blocking calls inside async FastAPI endpoints were blocking the event loop:
- `transcribe_audio()`: `remote_whisper_client.transcribe_file()` — sync Groq HTTP call
- `finalize_interview_background()`: `cv2.imread()` + `analyze_frame_yolo()` — sync I/O + YOLO inference
- `process_eye_frame()`: `analyze_frame_yolo()` — sync YOLO inference

During transcription or YOLO processing, no other requests could be served.

## Fix
All 4 blocking calls wrapped in `asyncio.to_thread()`:
- `transcribe_file` → `await asyncio.to_thread(remote_whisper_client.transcribe_file, final_path)`
- `cv2.imread` → `await asyncio.to_thread(cv2.imread, str(frame_path))`
- `analyze_frame_yolo` (in finalize) → `await asyncio.to_thread(analyze_frame_yolo, img)`
- `analyze_frame_yolo` (in eye_detection) → `await asyncio.to_thread(analyze_frame_yolo, img)`

Also made `_estimate_attention_from_frames` async and added `await` at its call site.
