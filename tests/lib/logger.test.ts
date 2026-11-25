import { describe, it, expect } from 'vitest'
import { logger } from '@/lib/logger'

describe('Logger', () => {
  it('has all log level methods', () => {
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
  })

  it('creates child loggers', () => {
    const child = logger.child('req-123')
    expect(typeof child.debug).toBe('function')
    expect(typeof child.info).toBe('function')
    expect(typeof child.warn).toBe('function')
    expect(typeof child.error).toBe('function')
  })
})
