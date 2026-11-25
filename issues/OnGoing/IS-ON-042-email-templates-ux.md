# IS-ON-042: Email Templates UX — Ordering & Default Issues

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Half-Baked
**Source:** CODEBASE_AUDIT_2026-05-23.md #42
**Component:** `app/(dashboard)/email-templates/page.tsx`
**Phase:** Phase 4 — Backlog

## Issue
```typescript
setTemplates([...DEFAULT_TEMPLATES, ...fetched])
```
User's saved templates always appear after hardcoded defaults. Initial selection defaults to `DEFAULT_TEMPLATES[0]` even if the API returned user-created templates. Default templates have IDs like `default-1`, `default-2` — can't actually be saved to the database.

## Fix
Show user templates first. Make defaults selectable only as templates to clone into user templates. Or make defaults truly editable by copying to DB on first edit.
