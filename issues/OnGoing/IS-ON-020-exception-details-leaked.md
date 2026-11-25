# IS-ON-020: Exception Details Leaked to Clients

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Security
**Source:** CODEBASE_AUDIT_2026-05-23.md #24
**Component:** `ai-interview-service/main.py`
**Phase:** Phase 3 — This Sprint

## Issue
```python
raise HTTPException(status_code=500, detail=str(e))
```
Raw exception messages (including file paths, library internals) are sent to API clients. Information disclosure vulnerability.

## Fix
Log the full exception on the server, return a generic error message to clients:
```python
logger.error(f"Error processing: {e}", exc_info=True)
raise HTTPException(status_code=500, detail="Internal server error")
```
