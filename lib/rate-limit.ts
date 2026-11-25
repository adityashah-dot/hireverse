/**
 * In-memory rate limiter for API routes.
 * Tracks requests per client (IP or user ID) with configurable window + limit.
 * For multi-instance production, swap with Redis-based limiter.
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  identifier?: string // key suffix to differentiate endpoints
}

interface BucketEntry {
  count: number
  resetAt: number
}

const buckets = new Map<string, BucketEntry>()

// Cleanup stale entries every 60s
const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key)
  }
}

function getClientKey(request: Request, identifier?: string) {
  // Prefer session-based key, fall back to IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const suffix = identifier ? `:${identifier}` : ''
  return `${ip}${suffix}`
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(request: Request, config: RateLimitConfig): RateLimitResult {
  cleanup()

  const key = getClientKey(request, config.identifier)
  const now = Date.now()

  let entry = buckets.get(key)
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs }
    buckets.set(key, entry)
  }

  entry.count++

  return {
    allowed: entry.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  }
}

/**
 * Wrap a route handler with rate limiting.
 * Returns 429 Too Many Requests if limit exceeded.
 */
export function withRateLimit<T extends (...args: any[]) => any>(
  config: RateLimitConfig,
  handler: T
): T {
  return (async (req: Request, ...args: any[]) => {
    const result = checkRateLimit(req, config)

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfterSeconds: retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.resetAt),
          },
        }
      )
    }

    const response = await handler(req, ...args)
    const res = response instanceof Response ? response.clone() : response
    if (res?.headers) {
      res.headers.set('X-RateLimit-Remaining', String(result.remaining))
      res.headers.set('X-RateLimit-Reset', String(result.resetAt))
    }

    return response
  }) as unknown as T
}
