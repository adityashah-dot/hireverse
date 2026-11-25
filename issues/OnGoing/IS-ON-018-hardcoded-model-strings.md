# IS-ON-018: Hardcoded Model Strings Instead of Config

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Config
**Source:** CODEBASE_AUDIT_2026-05-23.md #23
**Component:** `ai-interview-service/utils.py`, `ai-interview-service/whisper_client.py`
**Phase:** Phase 3 — This Sprint

## Issue
`config.GROQ_LLM_MODEL` and `config.GROQ_WHISPER_MODEL` exist but are ignored. The actual model strings are hardcoded:
- `utils.py`: `model="llama-3.3-70b-versatile"` (3 places)
- `whisper_client.py`: `self.model = "whisper-large-v3"`

Updating models requires finding and changing every hardcoded string.

## Fix
Use `config.GROQ_LLM_MODEL` and `config.GROQ_WHISPER_MODEL` everywhere. Remove hardcoded strings.
