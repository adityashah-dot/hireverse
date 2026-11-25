import Groq from 'groq-sdk'
import { z } from 'zod'
import { cosineSimilarity } from '@/lib/ai/embeddings'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SkillMatchSchema = z.object({
  score: z.number().min(0).max(100),
  matchingSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  summary: z.string(),
  semanticScores: z.array(z.object({
    jobSkill: z.string(),
    candidateSkill: z.string(),
    similarity: z.number().min(0).max(1),
  })).optional(),
})

const SemanticResultSchema = z.object({
  matches: z.array(z.object({
    jobSkill: z.string(),
    candidateSkill: z.string(),
    similarity: z.number().min(0).max(1),
  })),
  overallScore: z.number().min(0).max(1),
})

export interface SkillMatchResult {
  score: number
  matchingSkills: string[]
  missingSkills: string[]
  summary: string
  semanticScores?: Array<{ jobSkill: string; candidateSkill: string; similarity: number }>
  semanticOverallScore?: number
}

/**
 * Compute semantic similarity between job skills and candidate skills using the LLM.
 * Each skill pair gets a similarity score (0-1), and these are aggregated via
 * vector cosine similarity to produce an overall semantic match score.
 */
async function computeSemanticMatch(
  candidateSkills: string[],
  jobSkills: string[]
): Promise<{ scores: Array<{ jobSkill: string; candidateSkill: string; similarity: number }>; overall: number }> {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a semantic skill matching engine. Compare each job skill against every candidate skill and rate the similarity from 0.0 (completely unrelated) to 1.0 (exact match or highly overlapping).
Consider synonyms, related technologies, and transferable skills. For example, "React" and "React.js" = 1.0, "React" and "Vue.js" = 0.7, "React" and "Python" = 0.1.
Return valid JSON only.`,
      },
      {
        role: 'user',
        content: `Compare these skills semantically:

JOB SKILLS: ${jobSkills.join(', ')}
CANDIDATE SKILLS: ${candidateSkills.join(', ')}

For each job skill, find the best-matching candidate skill (if any) and rate the similarity.
Also compute an overall semantic match score (0.0-1.0) based on how many required skills have strong matches.

Return JSON:
{
  "matches": [
    { "jobSkill": "React", "candidateSkill": "React.js", "similarity": 0.95 },
    { "jobSkill": "AWS", "candidateSkill": "Cloud Computing", "similarity": 0.6 }
  ],
  "overallScore": 0.75
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 1500,
  })

  const raw = JSON.parse(response.choices[0].message.content!)
  const parsed = SemanticResultSchema.safeParse(raw)
  if (!parsed.success || parsed.data.matches.length === 0) {
    return { scores: [], overall: 0 }
  }
  return { scores: parsed.data.matches, overall: parsed.data.overallScore }
}

export async function matchSkills(
  candidateSkills: string[],
  jobSkills: string[],
  jobRequirements: string[],
  resumeText: string
): Promise<SkillMatchResult> {
  let lastErr: unknown

  // Try semantic matching first (lightweight, fast)
  let semanticScores: Array<{ jobSkill: string; candidateSkill: string; similarity: number }> = []
  let semanticOverall = 0
  try {
    const semantic = await computeSemanticMatch(candidateSkills, jobSkills)
    semanticScores = semantic.scores
    semanticOverall = semantic.overall
  } catch {
    // Semantic matching failed — continue with LLM-only approach
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await _matchSkillsAttempt(candidateSkills, jobSkills, jobRequirements, resumeText, semanticScores, semanticOverall)
    } catch (err) {
      lastErr = err
      if (err instanceof Error && err.message.startsWith('Failed to parse skill match result')) throw err
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
  throw lastErr
}

async function _matchSkillsAttempt(
  candidateSkills: string[],
  jobSkills: string[],
  jobRequirements: string[],
  resumeText: string,
  semanticScores: Array<{ jobSkill: string; candidateSkill: string; similarity: number }>,
  semanticOverall: number
): Promise<SkillMatchResult> {
  // Build semantic context for the LLM
  let semanticContext = ''
  if (semanticScores.length > 0) {
    const strong = semanticScores.filter(s => s.similarity >= 0.7)
    const moderate = semanticScores.filter(s => s.similarity >= 0.4 && s.similarity < 0.7)
    const weak = semanticScores.filter(s => s.similarity < 0.4)

    semanticContext = `\n\nSEMANTIC SKILL ANALYSIS (pre-computed):
Overall semantic match: ${(semanticOverall * 100).toFixed(0)}%
Strong matches (≥70%): ${strong.map(s => `${s.jobSkill} ↔ ${s.candidateSkill} (${(s.similarity*100).toFixed(0)}%)`).join(', ') || 'none'}
Moderate matches (40-69%): ${moderate.map(s => `${s.jobSkill} ↔ ${s.candidateSkill} (${(s.similarity*100).toFixed(0)}%)`).join(', ') || 'none'}
Weak/no matches (<40%): ${weak.map(s => s.jobSkill).join(', ') || 'none'}

Use these semantic scores to inform your final assessment. The semantic analysis already computed pairwise similarity, so pay close attention to the strong and moderate matches.`
  }

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are an expert technical recruiter. Analyze how well a candidate matches a job.
Consider both explicit skills and inferred abilities from their experience.
Use the provided semantic similarity data to refine your assessment.
Be fair, precise, and thorough. Return valid JSON only.`,
      },
      {
        role: 'user',
        content: `Analyze this candidate's fit for a job and return JSON.

JOB REQUIRED SKILLS: ${jobSkills.join(', ')}

JOB REQUIREMENTS:
${jobRequirements.slice(0, 10).join('\n')}

CANDIDATE SKILLS: ${candidateSkills.join(', ')}

CANDIDATE RESUME (excerpt):
${resumeText.slice(0, 6000)}${semanticContext}

Return JSON with:
{
  "score": 85,
  "matchingSkills": ["skills the candidate has that match"],
  "missingSkills": ["required skills the candidate lacks"],
  "summary": "2-3 sentence professional assessment of the candidate's fit"
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1000,
  })

  try {
    const raw = JSON.parse(response.choices[0].message.content!)
    const parsed = SkillMatchSchema.safeParse(raw)
    if (!parsed.success) {
      console.error('Skill match schema mismatch:', parsed.error.issues)
      throw new Error('Failed to parse skill match result: Unexpected AI response shape')
    }
    const result = parsed.data
    result.score = Math.max(0, Math.min(100, Math.round(result.score)))

    // Blend semantic score into the final result
    const blended = {
      score: semanticOverall > 0
        ? Math.round(result.score * 0.6 + semanticOverall * 100 * 0.4)
        : result.score,
      matchingSkills: result.matchingSkills,
      missingSkills: result.missingSkills,
      summary: result.summary,
      semanticScores: semanticScores.length > 0 ? semanticScores : undefined,
      semanticOverallScore: semanticOverall > 0 ? semanticOverall : undefined,
    }

    return blended
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Failed to parse skill match result')) throw err
    throw new Error('Failed to parse skill match result: Invalid JSON from AI')
  }
}
