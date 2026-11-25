# IS-ON-055: No Semantic/Vector Search with pgvector

**Status:** 🟢 OnGoing
**Severity:** 🟢 Low — Enhancement
**Source:** AUDIT_REPORT.md #14
**Component:** `lib/ai/embeddings.ts`, `lib/ai/match-skills.ts`
**Phase:** Phase 4 — Backlog

## Issue
`lib/ai/embeddings.ts` has `cosineSimilarity()` and `normalizeEmbedding()` but these are pure math functions — no embedding model is called, no `pgvector` is configured. The actual skill matching uses Groq LLM to compare skill pairs, which is better than string matching but not true embedding-based semantic search as described in the PRD.

## Fix
Either remove the unused embedding functions or implement actual embedding generation (OpenAI embeddings or sentence-transformers) with pgvector for true semantic search.
