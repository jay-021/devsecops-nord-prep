import { NextRequest, NextResponse } from 'next/server';
import { startPerformanceMonitoring, completePerformanceMonitoring } from './performance-monitor';
import { generateCorrelationId } from '@/lib/correlation-id';
import { logger } from '@/lib/structured-logger';
import { performanceLogger } from '@/lib/performance-logger';

// Performance middleware for Next.js API routes
export interface PerformanceMiddlewareOptions {
  enablePayloadTracking?: boolean;
  slowRequestThreshold?: number; // milliseconds
  maxPayloadSizeToLog?: number; // bytes
}

const defaultOptions: PerformanceMiddlewareOptions = {
  enablePayloadTracking: true,
  slowRequestThreshold: 1000,
  maxPayloadSizeToLog: 10000 // 10KB
};

// Middleware wrapper for API routes
export function withPerformanceMonitoring<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: PerformanceMiddlewareOptions = {}
) {
  const config = { ...defaultOptions, ...options };

  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const correlationId = request.headers.get('x-correlation-id') || generateCorrelationId();
    const userId = extractUserIdFromRequest(request);
    const endpoint = request.nextUrl.pathname;
    const method = request.method;
    
    let requestPayload: any = null;
    
    // Extract request payload for tracking (if enabled and reasonable size)
    if (config.enablePayloadTracking && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      try {
        const contentLength = request.headers.get('content-length');
        const payloadSize = contentLength ? parseInt(contentLength) : 0;
        
        if (payloadSize <= config.maxPayloadSizeToLog!) {
          // Clone the request to read the body without consuming it
          const clonedRequest = request.clone();
          const text = await clonedRequest.text();
          
          if (text) {
            try {
              requestPayload = JSON.parse(text);
            } catch {
              // If not JSON, store as text (truncated)
              requestPayload = { _text: text.substring(0, 500) };
            }
          }
        } else {
          requestPayload = { _payloadTooLarge: true, size: payloadSize };
        }
      } catch (error) {
        logger.warn({
          serviceName: 'performance-middleware',
          functionName: 'withPerformanceMonitoring',
          userId,
          additionalContext: {
            correlationId,
            endpoint,
            error: error instanceof Error ? error.message : String(error)
          }
        }, 'Failed to extract request payload for performance tracking');
      }
    }

    // Start performance monitoring
    const performanceContext = startPerformanceMonitoring(
      correlationId,
      endpoint,
      method,
      userId,
      requestPayload
    );

    let response: NextResponse;
    let statusCode = 500;
    let responsePayload: any = null;

    try {
      // Execute the actual handler
      response = await handler(request, ...args);
      statusCode = response.status;

      // Extract response payload for tracking (if enabled)
      if (config.enablePayloadTracking) {
        try {
          // Clone response to read body without consuming it
          const clonedResponse = response.clone();
          const responseText = await clonedResponse.text();
          
          if (responseText && responseText.length <= config.maxPayloadSizeToLog!) {
            try {
              responsePayload = JSON.parse(responseText);
            } catch {
              responsePayload = { _text: responseText.substring(0, 500) };
            }
          } else if (responseText) {
            responsePayload = { _payloadTooLarge: true, size: responseText.length };
          }
        } catch (error) {
          logger.warn({
            serviceName: 'performance-middleware',
            functionName: 'withPerformanceMonitoring',
            userId,
            additionalContext: {
              correlationId,
              endpoint,
              error: error instanceof Error ? error.message : String(error)
            }
          }, 'Failed to extract response payload for performance tracking');
        }
      }

      // Add correlation ID to response headers
      response.headers.set('x-correlation-id', correlationId);
      
    } catch (error) {
      statusCode = 500;
      
      logger.error({
        serviceName: 'performance-middleware',
        functionName: 'withPerformanceMonitoring',
        userId,
        additionalContext: {
          correlationId,
          endpoint,
          method
        }
      }, error instanceof Error ? error : new Error(String(error)));

      // Create error response
      response = NextResponse.json(
        {
          error: 'Internal Server Error',
          correlationId,
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
      
      response.headers.set('x-correlation-id', correlationId);
    } finally {
      // Complete performance monitoring
      const metrics = completePerformanceMonitoring(correlationId, statusCode, responsePayload);
      
      // Log performance summary
      if (metrics) {
        const isSlowRequest = metrics.totalExecutionTime > config.slowRequestThreshold!;
        
        const logLevel = isSlowRequest ? 'warn' : 'info';
        const logMessage = isSlowRequest 
          ? `SLOW REQUEST: ${method} ${endpoint} took ${metrics.totalExecutionTime}ms`
          : `Request completed: ${method} ${endpoint}`;

        logger[logLevel]({
          serviceName: 'performance-middleware',
          functionName: 'withPerformanceMonitoring',
          userId,
          additionalContext: {
            correlationId,
            endpoint,
            method,
            statusCode,
            performanceMetrics: {
              totalTime: metrics.totalExecutionTime,
              databaseTime: metrics.databaseQueryTime,
              externalServiceTime: metrics.externalServiceTime,
              queryCount: metrics.queryCount,
              externalCallCount: metrics.externalCallCount,
              requestSize: metrics.requestPayloadSize,
              responseSize: metrics.responsePayloadSize,
              slowQueries: metrics.slowQueries.length,
              slowExternalCalls: metrics.externalCalls.filter(call => call.duration > 1000).length
            }
          }
        }, logMessage);
        
        // Store performance data for admin dashboard
        performanceLogger.log({
          timestamp: new Date().toISOString(),
          endpoint,
          method,
          responseTime: metrics.totalExecutionTime,
          statusCode,
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          correlationId,
          userId,
          errorMessage: statusCode >= 400 ? logMessage : undefined
        });
      }
    }

    return response;
  };
}

// Helper function to extract user ID from request
function extractUserIdFromRequest(request: NextRequest): string | undefined {
  // Try to extract from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split('Bearer ')[1];
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        return payload.user_id || payload.sub || payload.uid;
      }
    } catch {
      // Ignore token parsing errors
    }
  }
  
  // Try to extract from custom header
  const userIdHeader = request.headers.get('x-user-id');
  if (userIdHeader) {
    return userIdHeader;
  }
  
  return undefined;
}

// Performance monitoring decorator for class methods
export function MonitorPerformance(operation: string, collection?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (this: any, ...args: any[]) {
      const correlationId = this.correlationId || generateCorrelationId();
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        
        // Track as database operation if collection is specified
        if (collection) {
          const { performanceMonitor } = await import('./performance-monitor');
          performanceMonitor.trackDatabaseQuery(
            correlationId,
            operation,
            collection,
            `${propertyName}(${args.map(arg => typeof arg).join(', ')})`,
            startTime
          );
        }
        
        return result;
      } catch (error) {
        logger.error({
          serviceName: 'performance-decorator',
          functionName: propertyName,
          additionalContext: {
            correlationId,
            operation,
            collection,
            duration: Date.now() - startTime
          }
        }, error instanceof Error ? error : new Error(String(error)));
        
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Utility function to create performance-aware database wrapper
export function createPerformanceAwareDbWrapper(db: any, correlationId: string) {
  return new Proxy(db, {
    get(target, prop) {
      const originalMethod = target[prop];
      
      if (typeof originalMethod === 'function') {
        return function (...args: any[]) {
          const startTime = Date.now();
          const operation = String(prop);
          
          const result = originalMethod.apply(target, args);
          
          // If it's a promise (async operation), track it
          if (result && typeof result.then === 'function') {
            return result.finally(() => {
              const { performanceMonitor } = require('./performance-monitor');
              performanceMonitor.trackDatabaseQuery(
                correlationId,
                operation,
                'firestore',
                `${operation}(${args.length} args)`,
                startTime
              );
            });
          }
          
          return result;
        };
      }
      
      return originalMethod;
    }
  });
}