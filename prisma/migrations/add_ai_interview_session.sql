-- Migration: add_ai_interview_session
-- Run this ONCE after starting PostgreSQL and HireVerse

-- Step 1: Add AI_VOICE to the InterviewType enum
ALTER TYPE "InterviewType" ADD VALUE IF NOT EXISTS 'AI_VOICE';

-- Step 2: Create AIInterviewSession table
CREATE TABLE IF NOT EXISTS "AIInterviewSession" (
  "id"               TEXT NOT NULL,
  "interviewId"      TEXT NOT NULL,
  "pySessionId"      TEXT NOT NULL,
  "candidateName"    TEXT NOT NULL,
  "candidateEmail"   TEXT NOT NULL,
  "position"         TEXT NOT NULL,
  "finalScore"       DOUBLE PRECISION,
  "passRate"         DOUBLE PRECISION,
  "overallStatus"    TEXT,
  "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
  "questionsPassed"  INTEGER NOT NULL DEFAULT 0,
  "transcripts"      JSONB,
  "attentionScore"   DOUBLE PRECISION,
  "violations"       JSONB,
  "status"           TEXT NOT NULL DEFAULT 'pending',
  "startedAt"        TIMESTAMP(3),
  "completedAt"      TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AIInterviewSession_pkey" PRIMARY KEY ("id")
);

-- Step 3: Unique constraints
ALTER TABLE "AIInterviewSession"
  ADD CONSTRAINT "AIInterviewSession_interviewId_key" UNIQUE ("interviewId"),
  ADD CONSTRAINT "AIInterviewSession_pySessionId_key" UNIQUE ("pySessionId");

-- Step 4: Foreign key to Interview
ALTER TABLE "AIInterviewSession"
  ADD CONSTRAINT "AIInterviewSession_interviewId_fkey"
  FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Indexes
CREATE INDEX IF NOT EXISTS "AIInterviewSession_interviewId_idx" ON "AIInterviewSession"("interviewId");
CREATE INDEX IF NOT EXISTS "AIInterviewSession_candidateEmail_idx" ON "AIInterviewSession"("candidateEmail");
CREATE INDEX IF NOT EXISTS "AIInterviewSession_status_idx" ON "AIInterviewSession"("status");
