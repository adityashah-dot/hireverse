# IS-ON-039: AI Insights Page — Fabricated Metrics

**Status:** 🟡 OnGoing
**Severity:** 🟡 Medium — Half-Baked
**Source:** CODEBASE_AUDIT_2026-05-23.md #39
**Component:** `app/(dashboard)/ai-insights/page.tsx`
**Phase:** Phase 3 — This Sprint

## Issue
```typescript
timeSaved: `${Math.min(8 + candidates.length * 0.3, 40).toFixed(0)} hrs`,
qualityScore: `+${Math.min(10 + Math.floor(candidates.length / 5), 30)}%`,
accuracy: `${Math.min(80 + Math.floor(candidates.length / 10), 95)}%`,
```
The "AI Performance Metrics" section fabricates values from `candidates.length` with no connection to real AI performance measurement. The "Configure AI" button has no handler.

**Note:** AUDIT_REPORT.md claimed this was fixed with real API data, but the metrics section is still synthetic.

## Fix
Replace with real metrics from the database (e.g., average skill match score, auto-stage accuracy, assessment completion rates). Or clearly label as "estimated."
