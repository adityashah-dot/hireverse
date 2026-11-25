# Issues

Combined issue tracker from AUDIT_REPORT.md and CODEBASE_AUDIT_2026-05-23.md.

**Total:** 80 issues (38 Fixed, 42 OnGoing)

---

## Summary

| Priority | OnGoing | Fixed |
|----------|---------|-------|
| 🔴 Critical | 6 | 11 |
| 🟠 Major | 6 | 6 |
| 🟡 Medium | 21 | 1 |
| 🔵 Minor | 5 | 0 |
| 🟢 Low | 2 | 0 |
| 🔧 Code Quality | 0 | 10 |
| 📋 Documentation | 0 | 1 |

---

## Fixed Issues (35)

| ID | Severity | Component | Issue |
|----|----------|-----------|-------|
| [IS-F01](Fixed/IS-F01-pipeline-stages.md) | 🔴 | Pipeline | Pipeline page stage mismatch with Prisma enum |
| [IS-F02](Fixed/IS-F02-ai-proxy-body-forwarding.md) | 🔴 | AI Proxy | AI proxy body forwarding for non-start POSTs |
| [IS-F03](Fixed/IS-F03-generate-questions-lazy-key.md) | 🔴 | Question Gen | generate-questions.ts top-level crash on missing key |
| [IS-F04](Fixed/IS-F04-assessment-preparing-message.md) | 🔴 | Assessments | PREPARING status returns empty questions |
| [IS-F05](Fixed/IS-F05-notifications-real-data.md) | 🟡 | Notifications | Notifications page mock data → real API |
| [IS-F06](Fixed/IS-F06-offer-letter-endpoint.md) | 🟡 | Offers | Offer letter generation endpoint |
| [IS-F07](Fixed/IS-F07-oauth-providers.md) | 🟠 | Auth | OAuth providers (Google, GitHub) |
| [IS-F08](Fixed/IS-F08-application-status-page.md) | 🟠 | Public | Candidate application status page |
| [IS-F09](Fixed/IS-F09-slack-teams-webhooks.md) | 🟠 | Webhooks | Slack/Teams notification integration |
| [IS-F10](Fixed/IS-F10-duplicate-candidate-detection.md) | 🟠 | Candidates | Cross-job duplicate detection |
| [IS-F11](Fixed/IS-F11-i18n-multi-language.md) | 🟠 | i18n | Multi-language support (5 languages) |
| [IS-F12](Fixed/IS-F12-department-filter-backend.md) | 🟠 | Dashboard | Department filter wired to backend |
| [IS-F13](Fixed/IS-F13-gdpr-tools.md) | 🟠 | GDPR | GDPR export/deletion endpoints |
| [IS-F14](Fixed/IS-F14-resume-parse-via-queue.md) | 🔧 | Queue | Resume parse via queue (async) |
| [IS-F15](Fixed/IS-F15-sha256-fingerprint.md) | 🔧 | Security | Browser fingerprint SHA256 |
| [IS-F16](Fixed/IS-F16-csrf-protection.md) | 🔧 | Security | CSRF protection middleware |
| [IS-F17](Fixed/IS-F17-seed-idempotent.md) | 🔧 | Prisma | Seed script idempotent |
| [IS-F18](Fixed/IS-F18-warnOnce-redis.md) | 🔧 | Queue | Redis outage warning spam fix |
| [IS-F19](Fixed/IS-F19-nvmrc.md) | 🔧 | Config | .nvmrc Node version pinning |
| [IS-F20](Fixed/IS-F20-interview-pregen-no-delete.md) | 🟡 | Interviews | Interview no longer deleted on pre-gen failure |
| [IS-F21](Fixed/IS-F21-cuid-to-crypto-token.md) | 🔧 | Security | Assessment tokens use crypto.randomBytes |
| [IS-F22](Fixed/IS-F22-vitest-tests.md) | 🟠 | Testing | Vitest test suite (TS only) |
| [IS-F23](Fixed/IS-F23-structured-logging-ts.md) | 🟠 | Logging | Structured logging (TS only) |
| [IS-F24](Fixed/IS-F24-rate-limiting-ts.md) | 🟠 | Security | API rate limiting (TS only) |
| [IS-F25](Fixed/IS-F25-docs-updates.md) | 📋 | Docs | Documentation fixes |
| [IS-F26](Fixed/IS-F26-groq-api-key-in-repo.md) | 🔴 | Python `.env` | Live Groq API key sanitized |
| [IS-F27](Fixed/IS-F27-python-service-auth.md) | 🔴 | Python API | Auth added to all 10 endpoints |
| [IS-F28](Fixed/IS-F28-nonatomic-session-writes.md) | 🔴 | Python | Atomic session file writes via os.replace() |
| [IS-F29](Fixed/IS-F29-global-random-seed.md) | 🔴 | Python | Local Random instance, no global RNG mutation |
| [IS-F30](Fixed/IS-F30-blocking-sync-in-async.md) | 🔴 | Python | Blocking calls wrapped in asyncio.to_thread() |
| [IS-F31](Fixed/IS-F31-load-dotenv-path.md) | 🔴 | Python | load_dotenv() uses explicit file-relative path |
| [IS-F32](Fixed/IS-F32-groq-migration.md) | 🔴 | AI | Migrated question generation from OpenAI to Groq |
| [IS-F33](Fixed/IS-F33-session-not-persisted-after-question-advance.md) | 🟠 | Python | Session not persisted after question advance |
| [IS-F34](Fixed/IS-F34-nonatomic-violation-logs.md) | 🟠 | Python | Non-atomic violation log writes |
| [IS-F35](Fixed/IS-F35-toc-tou-frame-counter.md) | 🟠 | Python | TOCTOU in frame counter |
| [IS-F36](Fixed/IS-F36-remaining-minutes-ignores-session-limit.md) | 🟠 | Python | get_remaining_minutes ignores session limit |
| [IS-F37](Fixed/IS-F37-datetime-fields-not-restored.md) | 🟠 | Python | Datetime fields not restored on load |
| [IS-F38](Fixed/IS-F38-nonatomic-frame-counter.md) | 🟠 | Python | Non-atomic in-memory frame counter |

---

## OnGoing Issues (42)

### 🔴 Critical (6)

| ID | Component | Issue |
|----|-----------|-------|
| [IS-ON-033](OnGoing/IS-ON-033-interview-type-zod-mismatch.md) | API | InterviewType Zod rejects AI_VOICE |
| [IS-ON-034](OnGoing/IS-ON-034-email-from-mismatch.md) | Email | EMAIL_FROM mismatch with Gmail SMTP |
| [IS-ON-035](OnGoing/IS-ON-035-csv-import-broken-jobid.md) | Bulk Actions | CSV import always passes empty jobId |
| [IS-ON-036](OnGoing/IS-ON-036-app-url-undefined-webhooks.md) | Webhooks | APP_URL undefined in webhook URLs |
| [IS-ON-037](OnGoing/IS-ON-037-worker-eager-redis-crash.md) | Worker | Worker eager Redis connection crash |
| [IS-ON-038](OnGoing/IS-ON-038-worker-bypasses-email-queue.md) | Worker | Assessment worker bypasses email queue |

### 🟠 Major (6)

| ID | Component | Issue |
|----|-----------|-------|
| [IS-ON-047](OnGoing/IS-ON-047-env-example-missing-vars.md) | Config | .env.example missing required variables |
| [IS-ON-050](OnGoing/IS-ON-050-webhook-secret-default.md) | Security | AI interview webhook secret is default |

### 🟡 Medium (21)

| ID | Component | Issue |
|----|-----------|-------|
| [IS-ON-013](OnGoing/IS-ON-013-no-webhook-retry.md) | Python | No webhook retry |
| [IS-ON-014](OnGoing/IS-ON-014-no-graceful-shutdown.md) | Python | No graceful shutdown |
| [IS-ON-015](OnGoing/IS-ON-015-no-dockerfile-python-service.md) | DevOps | No Dockerfile for Python service |
| [IS-ON-016](OnGoing/IS-ON-016-python-no-rate-limit.md) | Python | No rate limiting |
| [IS-ON-017](OnGoing/IS-ON-017-print-instead-of-logging.md) | Python | print() instead of logging |
| [IS-ON-018](OnGoing/IS-ON-018-hardcoded-model-strings.md) | Python | Hardcoded model strings |
| [IS-ON-019](OnGoing/IS-ON-019-zero-python-tests.md) | Python | Zero Python tests |
| [IS-ON-020](OnGoing/IS-ON-020-exception-details-leaked.md) | Python | Exception details leaked |
| [IS-ON-021](OnGoing/IS-ON-021-unbounded-storage-growth.md) | Python | Unbounded storage growth |
| [IS-ON-022](OnGoing/IS-ON-022-no-input-validation-answers.md) | Python | No input validation on answers |
| [IS-ON-023](OnGoing/IS-ON-023-dead-config-values.md) | Python | Dead config values |
| [IS-ON-024](OnGoing/IS-ON-024-ensure-question-shape-side-effects.md) | Python | ensure_question_shape side-effects |
| [IS-ON-025](OnGoing/IS-ON-025-duplicate-frame-functions.md) | Python | Duplicate frame functions |
| [IS-ON-039](OnGoing/IS-ON-039-ai-insights-fabricated-metrics.md) | Dashboard | AI Insights fabricated metrics |
| [IS-ON-040](OnGoing/IS-ON-040-reports-department-cosmetic.md) | Reports | Reports department filter cosmetic |
| [IS-ON-041](OnGoing/IS-ON-041-send-reminder-placeholder.md) | Interviews | Send Reminder placeholder |
| [IS-ON-042](OnGoing/IS-ON-042-email-templates-ux.md) | Email | Email templates UX issues |
| [IS-ON-043](OnGoing/IS-ON-043-interview-pregen-silent-fallback.md) | Interviews | Interview pre-gen silent fallback |
| [IS-ON-044](OnGoing/IS-ON-044-no-dead-letter-queue.md) | Queue | No dead-letter queue |
| [IS-ON-045](OnGoing/IS-ON-045-no-prisma-migrations.md) | Prisma | No migrations directory |
| [IS-ON-049](OnGoing/IS-ON-049-timer-discrepancy-services.md) | System | Timer discrepancy across services |
| [IS-ON-051](OnGoing/IS-ON-051-offers-no-get-endpoint.md) | Offers | No GET/listing for offers |
| [IS-ON-052](OnGoing/IS-ON-052-candidate-assessment-feedback.md) | Assessments | No candidate MCQ feedback |
| [IS-ON-053](OnGoing/IS-ON-053-no-webcam-mcq-proctoring.md) | Assessments | No webcam proctoring on MCQs |
| [IS-ON-054](OnGoing/IS-ON-054-no-human-review-ai.md) | AI | No human-in-the-loop AI review |

### 🔵 Minor (5)

| ID | Component | Issue |
|----|-----------|-------|
| [IS-ON-026](OnGoing/IS-ON-026-signal-dict-in-endpoint.md) | Python | Signal dict defined inside endpoint |
| [IS-ON-027](OnGoing/IS-ON-027-aggressive-difficulty-jumps.md) | Python | Aggressive difficulty jumps |
| [IS-ON-028](OnGoing/IS-ON-028-str-count-for-words.md) | Python | str.count() for word detection |
| [IS-ON-029](OnGoing/IS-ON-029-dead-pytz-dependency.md) | Python | Dead pytz dependency |
| [IS-ON-031](OnGoing/IS-ON-031-inconsistent-error-formats.md) | Python | Inconsistent error formats |

### 🟢 Low (2)

| ID | Component | Issue |
|----|-----------|-------|
| [IS-ON-046](OnGoing/IS-ON-046-docs-wrong-stack.md) | Docs | Docs claim wrong stack |
| [IS-ON-048](OnGoing/IS-ON-048-sessiontoken-schema-inconsistency.md) | Schema | sessionToken schema/code inconsistency |
| [IS-ON-055](OnGoing/IS-ON-055-no-vector-search.md) | AI | No semantic/vector search |

---

## Fix Priority Roadmap

### Phase 1 — Immediate (Security & Data Loss)
✅ All Phase 1 issues resolved.

### Phase 2 — This Week (Broken Features)
IS-ON-033, IS-ON-034, IS-ON-035, IS-ON-036, IS-ON-037, IS-ON-038, IS-ON-043, IS-ON-047, IS-ON-050

### Phase 3 — This Sprint (Polish)
IS-ON-013, IS-ON-014, IS-ON-015, IS-ON-016, IS-ON-017, IS-ON-018, IS-ON-020, IS-ON-021, IS-ON-022, IS-ON-023, IS-ON-024, IS-ON-025, IS-ON-039, IS-ON-044, IS-ON-045

### Phase 4 — Backlog (Nice-to-Have)
IS-ON-019, IS-ON-026, IS-ON-027, IS-ON-028, IS-ON-029, IS-ON-030, IS-ON-031, IS-ON-040, IS-ON-041, IS-ON-042, IS-ON-046, IS-ON-048, IS-ON-049, IS-ON-051, IS-ON-052, IS-ON-053, IS-ON-054, IS-ON-055
