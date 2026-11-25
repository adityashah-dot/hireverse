import { describe, it, expect } from 'vitest'
import { validateCsrf } from '@/lib/csrf'

describe('CSRF validation', () => {
  it('allows GET requests without origin', () => {
    const req = new Request('http://localhost:3000/api/public/jobs', { method: 'GET' })
    const result = validateCsrf(req)
    expect(result.valid).toBe(true)
  })

  it('allows HEAD requests without origin', () => {
    const req = new Request('http://localhost:3000/api/public/jobs', { method: 'HEAD' })
    const result = validateCsrf(req)
    expect(result.valid).toBe(true)
  })

  it('allows OPTIONS requests without origin', () => {
    const req = new Request('http://localhost:3000/api/public/jobs', { method: 'OPTIONS' })
    const result = validateCsrf(req)
    expect(result.valid).toBe(true)
  })

  it('allows POST with no origin header (server-to-server)', () => {
    const req = new Request('http://localhost:3000/api/public/apply', { method: 'POST' })
    const result = validateCsrf(req)
    expect(result.valid).toBe(true)
  })

  it('allows POST from localhost:3000', () => {
    const req = new Request('http://localhost:3000/api/public/apply', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    })
    const result = validateCsrf(req)
    expect(result.valid).toBe(true)
  })

  it('allows POST from 127.0.0.1:3000', () => {
    const req = new Request('http://localhost:3000/api/public/apply', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
    })
    const result = validateCsrf(req)
    expect(result.valid).toBe(true)
  })

  it('rejects POST from unknown origin', () => {
    const req = new Request('http://localhost:3000/api/public/apply', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
    })
    const result = validateCsrf(req)
    expect(result.valid).toBe(false)
    expect(result.reason).toBeDefined()
  })
})
