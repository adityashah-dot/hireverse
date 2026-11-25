# IS-ON-024: _ensure_question_shape() Side-Effects

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Design
**Source:** CODEBASE_AUDIT_2026-05-23.md #14
**Component:** `ai-interview-service/main.py`
**Phase:** Phase 3 — This Sprint

## Issue
```python
def _ensure_question_shape(question_pool: List[dict]) -> List[dict]:
    for q in question_pool:
        q.setdefault("ans", "")
```
Mutates the caller's list in-place. Every caller works around this by passing a freshly-loaded copy, but it's a latent footgun for future code.

## Fix
Either return a new list with modified copies (pure function), or rename to `_ensure_question_shape_in_place()` to make the mutation explicit.
