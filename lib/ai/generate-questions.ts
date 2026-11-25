import Groq from 'groq-sdk'
import { z } from 'zod'

let _groq: Groq | null = null

function getGroq(): Groq {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is not set')
    }
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _groq
}

export interface GeneratedQuestion {
  text: string
  options: string[]
  correctAnswer: number
  explanation: string
  category: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
}

export interface QuestionGenerationConfig {
  jobTitle: string
  skills: string[]
  experienceLevel: string
  count?: number
  difficultyMix?: { easy: number; medium: number; hard: number }
  focusTopics?: string[]
  candidateContext?: {
    matchingSkills?: string[]
    missingSkills?: string[]
    yearsExperience?: number
  }
}

const QuestionSchema = z.object({
  text: z.string().min(10),
  options: z.array(z.string()).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string().min(10),
  category: z.string(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
})

// Difficulty presets based on experience level
const DIFFICULTY_PRESETS: Record<string, { easy: number; medium: number; hard: number }> = {
  INTERN:       { easy: 0.6, medium: 0.3, hard: 0.1 },
  JUNIOR:       { easy: 0.5, medium: 0.35, hard: 0.15 },
  MID:          { easy: 0.3, medium: 0.45, hard: 0.25 },
  SENIOR:       { easy: 0.15, medium: 0.4, hard: 0.45 },
  LEAD:         { easy: 0.1, medium: 0.3, hard: 0.6 },
  ENTRY:        { easy: 0.5, medium: 0.35, hard: 0.15 },
  EXPERT:       { easy: 0.1, medium: 0.3, hard: 0.6 },
}

function getDifficultyDistribution(
  experienceLevel: string,
  count: number,
  customMix?: { easy: number; medium: number; hard: number }
) {
  if (customMix) {
    const total = customMix.easy + customMix.medium + customMix.hard
    const easy = Math.floor(count * (customMix.easy / total))
    const medium = Math.floor(count * (customMix.medium / total))
    const hard = Math.max(0, count - easy - medium)
    return { easy, medium, hard }
  }
  const preset = DIFFICULTY_PRESETS[experienceLevel.toUpperCase()] || DIFFICULTY_PRESETS.MID
  const easy = Math.floor(count * preset.easy)
  const medium = Math.floor(count * preset.medium)
  const hard = Math.max(0, count - easy - medium)
  return { easy, medium, hard }
}

export async function generateQuestions(
  jobTitleOrConfig: string | QuestionGenerationConfig,
  skills?: string[],
  experienceLevel?: string,
  count?: number
): Promise<GeneratedQuestion[]> {
  // Support both old signature and new config object
  let config: QuestionGenerationConfig
  if (typeof jobTitleOrConfig === 'string') {
    config = {
      jobTitle: jobTitleOrConfig,
      skills: skills || [],
      experienceLevel: experienceLevel || 'MID',
      count: count || 20,
    }
  } else {
    config = jobTitleOrConfig
  }

  const totalCount = config.count || 20
  const dist = getDifficultyDistribution(config.experienceLevel, totalCount, config.difficultyMix)

  // Build dynamic skill focus
  const skillsToAssess = config.focusTopics && config.focusTopics.length > 0
    ? config.focusTopics
    : config.skills

  // Build candidate-aware context for smarter question generation
  let candidateSection = ''
  if (config.candidateContext) {
    const ctx = config.candidateContext
    const parts: string[] = []
    if (ctx.matchingSkills?.length) {
      parts.push(`Candidate's STRONG skills: ${ctx.matchingSkills.join(', ')}. Include advanced questions on these to verify depth.`)
    }
    if (ctx.missingSkills?.length) {
      parts.push(`Candidate's WEAK/MISSING skills: ${ctx.missingSkills.join(', ')}. Include foundational questions on these to assess baseline knowledge.`)
    }
    if (ctx.yearsExperience) {
      parts.push(`Candidate has ${ctx.yearsExperience} years of experience.`)
    }
    if (parts.length > 0) {
      candidateSection = `\n\nCandidate Profile (tailor questions accordingly):\n${parts.join('\n')}`
    }
  }

  const response = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are an expert technical interviewer creating dynamic, AI-powered MCQ assessments.
Generate practical, scenario-based questions that test real-world knowledge.
Questions MUST be unique — never repeat patterns or rephrase the same concept.
Each question must have exactly 4 options with ONE correct answer.
Adapt question complexity to the candidate's experience level and skill profile.
Return valid JSON only — no markdown, no explanation outside JSON.`,
      },
      {
        role: 'user',
        content: `Generate ${totalCount} unique MCQ questions for a ${config.experienceLevel} ${config.jobTitle}.

Skills to assess: ${skillsToAssess.join(', ')}

Difficulty Distribution:
- ${dist.easy} EASY (fundamentals, definitions, basic concepts)
- ${dist.medium} MEDIUM (practical application, common patterns, debugging)
- ${dist.hard} HARD (advanced concepts, system design, edge cases, architecture)
${candidateSection}

Requirements:
- Each question MUST be scenario-based or practical where possible
- Distribute questions evenly across the listed skills
- Include real-world code snippets or scenarios when relevant
- Avoid trivial or textbook-only questions — test applied knowledge
- For HARD questions, include system design, performance, or architectural thinking

Return a JSON object with a "questions" array:
{
  "questions": [
    {
      "text": "Scenario-based question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why option A (index 0) is correct",
      "category": "React",
      "difficulty": "MEDIUM"
    }
  ]
}

Make sure:
- correctAnswer is the 0-based index (0, 1, 2, or 3)
- Options are distinct and plausible (realistic distractors)
- category matches the skill being tested
- difficulty is exactly "EASY", "MEDIUM", or "HARD"`,
      },
    ],
    temperature: 0.85,
    max_tokens: 8000,
  })

  try {
    const result = JSON.parse(response.choices[0].message.content!)
    const raw: unknown[] = result.questions || result

    const questions: GeneratedQuestion[] = []
    for (const item of raw) {
      const parsed = QuestionSchema.safeParse(item)
      if (parsed.success) {
        questions.push(parsed.data)
      } else {
        console.warn('Skipping malformed question:', parsed.error.issues)
      }
    }

    if (questions.length === 0) {
      throw new Error('Failed to generate questions: No valid questions in AI response')
    }

    return questions
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Failed to generate questions')) throw err
    throw new Error('Failed to generate questions: Invalid AI response')
  }
}
