import Groq from 'groq-sdk'
import { z } from 'zod'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const ParsedResumeSchema = z.object({
  name: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().nullish(),
  linkedIn: z.string().nullish(),
  portfolio: z.string().nullish(),
  location: z.string().nullish(),
  summary: z.string().nullish(),
  skills: z.array(z.string()).default([]),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
    isCurrent: z.boolean().optional(),
    description: z.string().nullish(),
  })).default([]),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    field: z.string().nullish(),
    graduationYear: z.number().nullish(),
    gpa: z.number().nullish(),
  })).default([]),
  totalYearsExperience: z.number().nullish(),
})

export interface ParsedResume {
  name: string
  email: string
  phone?: string
  linkedIn?: string
  portfolio?: string
  location?: string
  summary?: string
  skills: string[]
  experience: Array<{
    company: string
    title: string
    startDate?: string
    endDate?: string
    isCurrent?: boolean
    description?: string
  }>
  education: Array<{
    institution: string
    degree: string
    field?: string
    graduationYear?: number
    gpa?: number
  }>
  totalYearsExperience?: number
}

export async function parseResume(resumeText: string): Promise<ParsedResume> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await _parseResumeAttempt(resumeText)
    } catch (err) {
      lastErr = err
      if (err instanceof Error && err.message.startsWith('Failed to parse resume')) throw err
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
  throw lastErr
}

async function _parseResumeAttempt(resumeText: string): Promise<ParsedResume> {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are an expert resume parser. Extract structured information from resumes.
Return valid JSON only. No markdown, no explanation, no code blocks.
For dates use "YYYY-MM" format or just year. Calculate total years of experience from work history.
If information is not available, use null for optional fields.`,
      },
      {
        role: 'user',
        content: `Parse this resume and return a JSON object with these exact fields:
{
  "name": "string",
  "email": "string",
  "phone": "string or null",
  "linkedIn": "string or null",
  "portfolio": "string or null",
  "location": "string or null",
  "summary": "2-3 sentence professional summary",
  "skills": ["array", "of", "skill", "strings"],
  "experience": [
    {
      "company": "string",
      "title": "string",
      "startDate": "YYYY-MM or null",
      "endDate": "YYYY-MM or null",
      "isCurrent": false,
      "description": "string or null"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string or null",
      "graduationYear": 2020,
      "gpa": 3.5
    }
  ],
  "totalYearsExperience": 5
}

Resume text:
${resumeText.slice(0, 8000)}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 2000,
  })

  try {
    const raw = JSON.parse(response.choices[0].message.content!)
    const result = ParsedResumeSchema.safeParse(raw)
    if (!result.success) {
      console.error('Resume parse schema mismatch:', result.error.issues)
      throw new Error('Failed to parse resume: Unexpected AI response shape')
    }
    return result.data as ParsedResume
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Failed to parse resume')) throw err
    throw new Error('Failed to parse resume: Invalid JSON from AI')
  }
}
