/**
 * CSRF protection for API routes.
 * Checks the Origin/Referer header against allowed origins for state-changing requests.
 * This provides Same-Origin verification for form submissions and API calls.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']

function getAllowedOrigins(): string[] {
  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || ''
  const origins = [...DEV_ORIGINS]
  if (appUrl) {
    try {
      origins.push(new URL(appUrl).origin)
    } catch { /* invalid URL, skip */ }
  }
  if (process.env.ADDITIONAL_ALLOWED_ORIGINS) {
    process.env.ADDITIONAL_ALLOWED_ORIGINS.split(',').forEach((o) => {
      try {
        origins.push(new URL(o.trim()).origin)
      } catch { /* skip */ }
    })
  }
  return origins
}

function normalizeOrigin(origin: string | null): string | null {
  if (!origin) return null
  try {
    return new URL(origin).origin
  } catch {
    return null
  }
}

export function validateCsrf(request: Request): { valid: boolean; reason?: string } {
  const method = request.method.toUpperCase()
  if (SAFE_METHODS.has(method)) return { valid: true }

  const origin = normalizeOrigin(request.headers.get('origin'))
  const referer = request.headers.get('referer')
  const refererOrigin = normalizeOrigin(referer)

  // If neither Origin nor Referer is present, this is likely a server-to-server
  // or native mobile request — allow it. Browsers always send Origin on cross-origin
  // and same-origin POSTs (except same-origin form submissions from some contexts).
  if (!origin && !refererOrigin) return { valid: true }

  const requestOrigin = origin || refererOrigin
  if (!requestOrigin) return { valid: true }

  const allowedOrigins = getAllowedOrigins()
  if (allowedOrigins.includes(requestOrigin)) return { valid: true }

  return {
    valid: false,
    reason: `Origin "${requestOrigin}" not in allowed origins`,
  }
}
