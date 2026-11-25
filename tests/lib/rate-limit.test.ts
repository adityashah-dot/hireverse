import { describe, it, expect } from 'vitest'
import { checkRateLimit } from '@/lib/rate-limit'

describe('Rate limiter', () => {
  it('allows requests within limit', () => {
    const req = new Request('http://localhost:3000/api/public/apply', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })

    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(req, {
        maxRequests: 10,
        windowMs: 60_000,
        identifier: 'test',
      })
      expect(result.allowed).toBe(true)
    }
  })

  it('blocks requests exceeding limit', () => {
    const req = new Request('http://localhost:3000/api/public/apply', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.99' },
    })

    for (let i = 0; i < 5; i++) {
      checkRateLimit(req, { maxRequests: 5, windowMs: 60_000, identifier: 'test2' })
    }

    const result = checkRateLimit(req, {
      maxRequests: 5,
      windowMs: 60_000,
      identifier: 'test2',
    })
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('provides remaining count', () => {
    const req = new Request('http://localhost:3000/api/public/apply', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.50' },
    })

    const result = checkRateLimit(req, {
      maxRequests: 100,
      windowMs: 60_000,
      identifier: 'test3',
    })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })

  it('separates limits by identifier', () => {
    const req = new Request('http://localhost:3000/api/public/apply', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.200' },
    })

    const r1 = checkRateLimit(req, { maxRequests: 2, windowMs: 60_000, identifier: 'endpoint-a' })
    const r2 = checkRateLimit(req, { maxRequests: 2, windowMs: 60_000, identifier: 'endpoint-b' })
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r1.remaining).toBe(1)
    expect(r2.remaining).toBe(1)
  })
})
