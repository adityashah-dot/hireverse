# IS-ON-046: Docs Claim PlanetScale/OpenAI GPT-4 — Actual Stack Differs

**Status:** 🟢 OnGoing
**Severity:** 🟢 Low — Documentation
**Source:** CODEBASE_AUDIT_2026-05-23.md #46-47
**Component:** `docs/PRD.md`, `CLAUDE.md`
**Phase:** Phase 4 — Backlog

## Issue
Multiple docs reference PlanetScale as the database provider — actual stack uses Supabase. `CLAUDE.md` claims "OpenAI GPT-4" for question generation — actual model is `gpt-4o-mini`.

**Note:** AUDIT_REPORT.md #37 claims PlanetScale references were fixed in PRD.md and QA_GUIDE.md, but `CLAUDE.md` and other docs may still have stale references.

## Fix
Audit all docs for PlanetScale and GPT-4 references. Update to reflect actual stack (Supabase, GPT-4o-mini).
