/**
 * Structured JSON logger.
 * Replaces raw console.log/warn/error with structured output that includes
 * timestamps, log levels, correlation IDs, and sanitised context.
 *
 * In development, logs are pretty-printed. In production they're single-line JSON
 * for log aggregation tools (Sentry, Datadog, CloudWatch, etc.).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  correlationId?: string
  context?: Record<string, unknown>
  error?: string
  stack?: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const levelLabel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[levelLabel]
}

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry)
  }
  const color =
    entry.level === 'error' ? '\x1b[31m' :
    entry.level === 'warn' ? '\x1b[33m' :
    entry.level === 'debug' ? '\x1b[36m' : '\x1b[32m'
  const reset = '\x1b[0m'
  const parts = [
    `${color}[${entry.level.toUpperCase()}]${reset}`,
    entry.timestamp,
    entry.correlationId ? `[${entry.correlationId}]` : '',
    entry.message,
  ]
  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context, null, 2))
  }
  if (entry.error) {
    parts.push(`\n${entry.error}`)
    if (entry.stack) parts.push(`\n${entry.stack}`)
  }
  return parts.filter(Boolean).join(' ')
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
  if (!shouldLog(level)) return

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: sanitizeContext(context),
  }

  if (error) {
    entry.error = error.message
    if (process.env.NODE_ENV !== 'production') {
      entry.stack = error.stack
    }
  }

  const output = formatEntry(entry)

  if (level === 'error') console.error(output)
  else if (level === 'warn') console.warn(output)
  else console.log(output)
}

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined
  const sanitized = { ...context }
  const sensitiveKeys = ['password', 'token', 'secret', 'apikey', 'api_key', 'authorization', 'passwordhash']
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]'
    }
  }
  return sanitized
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, error?: Error, context?: Record<string, unknown>) => write('error', message, context, error),

  /** Create a child logger with a correlation ID for request tracing */
  child: (correlationId: string) => ({
    debug: (message: string, context?: Record<string, unknown>) => write('debug', message, { ...context, correlationId }),
    info: (message: string, context?: Record<string, unknown>) => write('info', message, { ...context, correlationId }),
    warn: (message: string, context?: Record<string, unknown>) => write('warn', message, { ...context, correlationId }),
    error: (message: string, error?: Error, context?: Record<string, unknown>) => write('error', message, { ...context, correlationId }, error),
  }),
}
