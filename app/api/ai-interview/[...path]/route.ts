import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const AI_SERVICE_URL = process.env.AI_INTERVIEW_SERVICE_URL || 'http://localhost:8000'

/**
 * Proxy all /api/ai-interview/* requests to the Python FastAPI service.
 * The [...path] catches everything after /api/ai-interview/
 * 
 * e.g.  POST /api/ai-interview/interview/start
 *         → POST http://localhost:8000/api/interview/start
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, 'POST')
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const isInterviewStart =
      method === 'POST' &&
      Array.isArray(pathSegments) &&
      pathSegments.length === 2 &&
      pathSegments[0] === 'interview' &&
      pathSegments[1] === 'start'

    let parsedStartBody: any = null
    if (isInterviewStart) {
      parsedStartBody = await request.json().catch(() => null)
      const interviewId = parsedStartBody?.candidate_info?.hireverse_interview_id

      if (interviewId) {
        const interview = await prisma.interview.findUnique({
          where: { id: interviewId },
          select: { scheduledAt: true, status: true },
        })

        if (!interview) {
          return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
        }

        if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(interview.status)) {
          return NextResponse.json({ error: 'This interview session is no longer active.' }, { status: 410 })
        }

        const now = new Date()
        // Parse as UTC — interview.scheduledAt is stored as UTC in Postgres
        const scheduledAt = new Date(interview.scheduledAt.toISOString())
        const windowMs = 10 * 60 * 1000
        const earliestAccess = new Date(scheduledAt.getTime() - windowMs)
        const latestAccess = new Date(scheduledAt.getTime() + windowMs)

        if (now < earliestAccess || now > latestAccess) {
          return NextResponse.json(
            {
              error: 'Interview link can only be accessed from 10 minutes before to 10 minutes after the scheduled time.',
              accessWindowStart: earliestAccess.toISOString(),
              accessWindowEnd: latestAccess.toISOString(),
              scheduledAt: scheduledAt.toISOString(),
            },
            { status: 403 }
          )
        }
      }
    }

    // Reconstruct target path: strip "complete" segment (that's our webhook, handled elsewhere)
    // Everything else goes to Python: /api/ai-interview/interview/start → /api/interview/start
    const targetPath = '/api/' + (pathSegments ? pathSegments.join('/') : '')
    const searchParams = request.nextUrl.searchParams.toString()
    const targetUrl = `${AI_SERVICE_URL}${targetPath}${searchParams ? '?' + searchParams : ''}`

    // Forward the auth secret to the Python service
    const forwardHeaders: Record<string, string> = {}
    if (process.env.AI_SERVICE_AUTH_SECRET) {
      forwardHeaders['authorization'] = `Bearer ${process.env.AI_SERVICE_AUTH_SECRET}`
    }
    
    // Forward headers (excluding host and hop-by-hop headers)
    const forbiddenHeaders = ['host', 'connection', 'transfer-encoding', 'keep-alive', 'content-length', 'expect']
    
    request.headers.forEach((value, key) => {
      if (!forbiddenHeaders.includes(key.toLowerCase())) {
        forwardHeaders[key] = value
      }
    })

    let body: BodyInit | undefined
    if (method !== 'GET' && method !== 'HEAD') {
      if (isInterviewStart) {
        body = JSON.stringify(parsedStartBody || {})
        forwardHeaders['content-type'] = 'application/json'
      } else {
        const contentType = request.headers.get('content-type') || ''
        if (contentType.includes('multipart/form-data')) {
          body = request.body as unknown as BodyInit
        } else if (contentType.includes('application/json')) {
          const jsonBody = await request.json().catch(() => ({}))
          body = JSON.stringify(jsonBody)
          forwardHeaders['content-type'] = 'application/json'
        } else {
          body = request.body as unknown as BodyInit
        }
      }
    }

    const response = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body,
      // @ts-ignore - Required for passing ReadableStream in Node fetch
      duplex: 'half'
    })

    const responseData = await response.arrayBuffer()

    return new NextResponse(responseData, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    console.error('[AI Interview Proxy] Error:', error)
    return NextResponse.json(
      { error: 'AI Interview service unavailable', details: error.message },
      { status: 503 }
    )
  }
}
