# IS-F31: load_dotenv() With No Explicit Path

**Status:** ✅ Fixed
**Severity:** 🔴 Critical — Bug
**Source:** CODEBASE_AUDIT_2026-05-23.md #6
**Fixed:** 2026-05-23

## Issue
```python
load_dotenv()
```
Searched CWD and parent directories for `.env`. If started from a different directory, it silently loaded nothing. Groq clients in `utils.py` and `whisper_client.py` initialize at module import time — with empty API keys, every call failed silently.

## Fix
```python
load_dotenv(Path(__file__).parent / ".env")
```
Always resolves relative to the Python file's location, regardless of CWD.
