# IS-F33: Session Not Persisted After Question Advancement

**Status:** ✅ Fixed
**Severity:** 🟠 Major — Data Loss
**Source:** CODEBASE_AUDIT_2026-05-23.md #7
**Component:** `ai-interview-service/main.py` — `process_answer()`
**Phase:** Phase 2 — This Week

## Issue
In `process_answer()`, `_save_session()` was called before question advancement but not after:
```python
# ... 
next_q = choose_next_question(session["question_pool"], ...)
if next_q:
    session["current_question"] = next_q
    session["current_question_num"] += 1
# ⚠️ _save_session NOT called after this!
```
If the server crashed between advancing to the next question and the next request, the session file had stale `current_question` and `current_question_num`. On resume, the candidate got the same question again.

## Fix
Added `_save_session(response.session_id)` after advancing to the next question in `process_answer()` at line ~1022.

## Changed
- `ai-interview-service/main.py`: Added `_save_session(response.session_id)` call after `session["current_question_num"] += 1` inside the `if next_q:` block.

## Date
2026-05-23
