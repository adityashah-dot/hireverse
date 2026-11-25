import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { validateCsrf } from '@/lib/csrf'

export default withAuth(
  function middleware(req) {
    // CSRF protection for state-changing API routes (POST, PUT, PATCH, DELETE)
    if (req.nextUrl.pathname.startsWith('/api/')) {
      const method = req.method.toUpperCase()
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const { valid, reason } = validateCsrf(req)
        if (!valid) {
          return NextResponse.json({ error: 'CSRF validation failed', reason }, { status: 403 })
        }
      }
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl

        // Public routes — no auth needed
        const publicPaths = [
          '/api/auth',
          '/api/public',
          '/api/assessments/',
          '/api/ai-interview',   // AI interview proxy — public (candidates use it)
          '/sign-in',
          '/sign-up',
          '/forgot-password',
          '/reset-password',
          '/apply',
          '/assessment',
          '/ai-interview',       // AI interview pages — public (candidates)
          '/application-status', // Candidate application status page
          '/careers',
        ]
        if (publicPaths.some((p) => pathname.startsWith(p))) {
          return true
        }

        // All other API/dashboard routes require auth
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/jobs/:path*',
    '/candidates/:path*',
    '/assessments/:path*',
    '/settings/:path*',
    '/interviews/:path*',
    '/pipeline/:path*',
    '/reports/:path*',
    '/send-links/:path*',
    '/bulk-actions/:path*',
    '/ai-insights/:path*',
    '/team/:path*',
    '/calendar/:path*',
    '/notifications/:path*',
    '/email-templates/:path*',
  ],
}
