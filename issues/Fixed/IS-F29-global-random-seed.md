# IS-F29: random.seed() Corrupts Global RNG State

**Status:** ✅ Fixed
**Severity:** 🔴 Critical — Thread Safety
**Source:** CODEBASE_AUDIT_2026-05-23.md #4
**Fixed:** 2026-05-23

## Issue
```python
random.seed(seed)
return random.choice(available)
```
Mutated the global `random` module state. Two concurrent sessions raced on the seed/choice pair. After this call, all subsequent `random.*` calls anywhere in the process became predictable until the next seed.

## Fix
Use a local Random instance — no mutation of global state:
```python
return random.Random(seed).choice(available)
```
Each session gets its own isolated RNG. Concurrent sessions can't interfere.
