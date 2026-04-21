import { NextRequest, NextResponse } from 'next/server'
import { generateCorrelationId, isValidCorrelationId, CORRELATION_ID_HEADER } from './lib/correlation-id'
import { logger, createApiContext, createTimingContext } from './lib/structured-logger'

export function middleware(request: NextRequest) {
  const { startTime } = createTimingContext()
  
  // Handle Vite client requests that may come from browser dev tools or extensions
  // This prevents 404 errors in development when tools expect Vite's HMR client
  if (request.nextUrl.pathname === '/@vite/client') {
    return new NextResponse('', { status: 200 }) // OK
  }

  // Handle correlation ID for request tracing
  let correlationId = request.headers.get(CORRELATION_ID_HEADER)
  const incomingCorrelationId = correlationId
  
  // Generate correlation ID if not provided or invalid
  if (!correlationId || !isValidCorrelationId(correlationId)) {
    correlationId = generateCorrelationId()
  }

  // Create response with correlation ID in headers
  const response = NextResponse.next()
  response.headers.set(CORRELATION_ID_HEADER, correlationId)
  
  // Add correlation ID to request headers for API routes
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(CORRELATION_ID_HEADER, correlationId)
  
  // Log the request with structured logging
  const context = createApiContext(request, 'middleware')
  logger.logRequest(context, startTime, 200, {
    correlationIdGenerated: !incomingCorrelationId || !isValidCorrelationId(incomingCorrelationId),
    originalCorrelationId: incomingCorrelationId
  })
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Include API routes for correlation ID handling
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/@vite/client',
  ],
}