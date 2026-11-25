# Product Requirements Document (PRD)

## 1. Product Overview

### Product Name
HireVerse

### Product Vision
Build a unified hiring platform that helps teams attract, evaluate, and hire candidates faster through AI-assisted screening, secure assessments, and structured interview workflows.

### Product Summary
HireVerse combines:
- ATS capabilities for jobs, applications, and candidate pipeline management
- AI-assisted resume parsing and skill matching
- MCQ-based online assessment generation and auto-grading
- AI interview capabilities (speech transcription, response evaluation, and attention monitoring)
- Recruiter workflows for decisioning, reporting, and communication

The project currently includes a Next.js core platform and Python-based AI interview services that can run as integrated components.

## 2. Problem Statement

Hiring teams face these recurring problems:
- High manual effort in resume review and shortlist creation
- Low signal quality from keyword-only screening
- Fragmented tools for ATS, assessments, and interviews
- Weak anti-cheating controls in remote evaluations
- Slow and inconsistent candidate decision cycles

## 3. Goals and Objectives

### Business Goals
- Reduce time-to-shortlist and time-to-hire
- Improve quality of shortlisted candidates
- Increase recruiter throughput per open role
- Provide an auditable hiring workflow for all candidate decisions

### Product Goals
- Deliver one workspace for sourcing to decision
- Provide reliable AI support while keeping recruiter-in-control workflows
- Support secure remote assessments and interviews
- Produce structured analytics for hiring outcomes

### Success Criteria (12-month target)
- 40% reduction in average resume screening effort per role
- 25% reduction in average time-to-hire
- 20% increase in interview-to-offer conversion for shortlisted candidates
- 95% successful assessment session completion rate
- 99.9% API uptime for critical candidate-facing flows

## 4. Users and Personas

### Primary Users
1. Recruiter
- Creates jobs, manages applicants, sends assessments, reviews outcomes

2. Hiring Manager
- Reviews candidate quality, compares interview/assessment evidence, approves decisions

3. Candidate
- Applies to jobs, completes assessments/interviews, tracks status updates

### Secondary Users
4. Admin
- Manages organization settings, team permissions, and platform policies

## 5. Scope

### In Scope (MVP + Current Build Alignment)
- Authentication and role-based access (admin/recruiter/viewer variants)
- Job lifecycle management (draft, publish, close)
- Public job listing and application intake
- Candidate profile management with stage transitions
- Resume upload and AI parsing
- AI skill matching against job requirements
- Question generation and assessment delivery by tokenized links
- Assessment attempt tracking, grading, and anti-cheating events
- Interview scheduling and feedback capture
- AI interview microservice integration:
  - Speech-to-text transcription
  - LLM-based answer evaluation
  - Session control and result webhook
  - Eye attention signal capture and analysis output
- Basic analytics dashboard and pipeline metrics
- Email notifications for key workflow events

### Out of Scope (This PRD Version)
- Full multi-tenant enterprise SSO (SAML/SCIM)
- Native mobile applications
- Marketplace integrations beyond core email/storage/auth
- Advanced psychometric testing frameworks
- Offline interview mode

## 6. Key User Journeys

### Journey A: Recruiter Creates and Publishes a Job
1. Recruiter signs in
2. Creates job with role details and required skills
3. Publishes job to public listing
4. Shares application link

Expected outcome: Job is discoverable and starts receiving applications.

### Journey B: Candidate Applies and Gets Screened
1. Candidate opens public job page
2. Submits profile and resume
3. Resume is parsed and candidate profile is enriched
4. AI computes fit score against job criteria

Expected outcome: Recruiter sees structured profile + AI-assisted shortlist signal.

### Journey C: Recruiter Sends Assessment
1. Recruiter selects candidate and triggers assessment
2. System generates or selects question set
3. Candidate receives secure link and starts test
4. System logs events, enforces time window, and grades submission

Expected outcome: Recruiter receives objective score + integrity metadata.

### Journey D: AI Interview Completion
1. Recruiter schedules AI interview session
2. Candidate starts session via secure session link
3. Service records/transcribes answers and evaluates response quality
4. Interview result is posted back to core platform via webhook

Expected outcome: Candidate profile includes interview score, rationale, and attention indicators.

## 7. Functional Requirements

### FR-1 Authentication and Authorization
- Support secure login and role-based access control
- Restrict dashboard and API actions based on role
- Track user activity for auditability

### FR-2 Job Management
- Create, edit, publish, close, and archive jobs
- Store skills, requirements, and metadata
- Generate public-facing application endpoint per job

### FR-3 Candidate Management
- Create and update candidate records
- Upload and store resumes
- Maintain candidate stage transitions in pipeline
- Store notes and activity timeline

### FR-4 AI Resume Processing
- Extract resume text from common file formats
- Parse into structured candidate attributes
- Generate human-readable candidate summary

### FR-5 AI Matching
- Compute candidate-job fit score
- Provide score breakdown by skills/topics
- Make scoring available in candidate and job views

### FR-6 Assessment Engine
- Generate role-specific question sets
- Create secure assessment links and sessions
- Enforce time limits and session rules
- Auto-grade objective questions
- Save detailed attempt data and final score

### FR-7 Interview Workflow
- Create interview records and schedules
- Capture interviewer/recruiter feedback
- Persist final recommendation and rationale

### FR-8 AI Interview Service Integration
- Start interview sessions from core platform context
- Accept candidate audio responses
- Perform speech transcription and LLM evaluation
- Log and summarize eye/attention data
- Push completion results to platform webhook with verification secret

### FR-9 Notification and Communication
- Send assessment invites and status notifications
- Support configurable sender identity and templates

### FR-10 Analytics and Reporting
- Show funnel metrics (application to hire)
- Show stage distribution and assessment outcomes
- Enable role-level dashboard views

## 8. Non-Functional Requirements

### NFR-1 Security
- Signed or hard-to-guess candidate access tokens
- Secret validation for service-to-service webhooks
- Protection against unauthorized dashboard access
- Secure storage handling for uploaded documents

### NFR-2 Performance
- Dashboard and candidate list API p95 under 800 ms for typical organization sizes
- Candidate-facing assessment page initial load under 2.5 s on broadband

### NFR-3 Reliability
- 99.9% uptime target for candidate-facing endpoints
- Queue-based processing for non-blocking heavy tasks

### NFR-4 Scalability
- Horizontal scaling for web tier and worker tier
- Separate scaling path for AI interview microservice

### NFR-5 Observability
- Structured logs for API, assessment, and interview flows
- Error tracking and alerting for failed evaluations and webhook delivery

## 9. Data and Integrations

### Core Data Domains
- Organization and user accounts
- Job definitions and statuses
- Candidate profiles and documents
- Assessment sessions, responses, and scores
- Interview sessions and feedback
- Event logs and security incidents

### External Integrations
- LLM providers for parsing/generation/evaluation
- Object storage (S3-compatible)
- Email delivery provider
- Redis-backed queue infrastructure
- Optional DB integrations in AI interview workflows

## 10. Risks and Mitigations

1. AI quality inconsistency
- Mitigation: Add score explanations, fallback rules, and manual override UX

2. Candidate cheating or session misuse
- Mitigation: Add event logging, browser/session controls, and expiration windows

3. Cross-service drift between Next.js and Python interview service
- Mitigation: Versioned API contract and webhook payload schema tests

4. Latency and cost from heavy AI calls
- Mitigation: Queueing, caching where possible, and configurable model choices

5. Data privacy and compliance exposure
- Mitigation: Minimize retained PII, configure retention policy, and secure secrets management

## 11. Milestones and Delivery Plan

### Phase 1: Core ATS Foundation
- Auth, jobs, candidates, pipeline, public apply

### Phase 2: AI Screening
- Resume parse, skill matching, recruiter score views

### Phase 3: Assessments
- Question generation, secure delivery, grading, event logging

### Phase 4: AI Interview Integration
- Session orchestration, transcription/evaluation, webhook result sync

### Phase 5: Analytics and Operational Hardening
- Dashboards, observability, performance tuning, reliability improvements

## 12. Acceptance Criteria (Release Gate)

1. Recruiter can create and publish a job and receive candidate applications end-to-end
2. Resume upload triggers parse and fit scoring visible in candidate profile
3. Assessment invite to submission flow works with scoring and integrity events
4. AI interview completion updates candidate record via webhook reliably
5. Role-based access prevents unauthorized operations
6. Core API and candidate-facing experiences meet baseline NFR targets

## 13. Open Questions

1. Should AI interview become the default interview stage for all roles or only selected job templates?
2. Which AI providers/models are mandatory versus configurable by environment?
3. What compliance requirements apply first (GDPR, SOC 2, regional data residency)?
4. Should candidate status notifications be real-time in-app, email-only, or both?
5. What level of explainability is required for AI scores before enterprise rollout?

## 14. Appendix: Current Implementation Notes

- Core platform stack includes Next.js, Prisma, PostgreSQL, Redis queueing, and role-based dashboard/API structure.
- AI interview capability exists as a Python FastAPI microservice with transcription, response evaluation, eye tracking, and webhook callback support.
- Legacy and parallel folders in the repository indicate ongoing consolidation work; this PRD treats them as components of one product direction.
