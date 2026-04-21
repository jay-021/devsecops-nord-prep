import { logger } from '@/lib/structured-logger';

// Performance monitoring interfaces
export interface PerformanceMetrics {
  totalExecutionTime: number;
  databaseQueryTime: number;
  externalServiceTime: number;
  requestPayloadSize: number;
  responsePayloadSize: number;
  queryCount: number;
  externalCallCount: number;
  slowQueries: SlowQuery[];
  externalCalls: ExternalCall[];
}

export interface SlowQuery {
  query: string;
  duration: number;
  collection?: string;
  operation: string;
  timestamp: number;
}

export interface ExternalCall {
  service: string;
  endpoint: string;
  method: string;
  duration: number;
  statusCode?: number;
  timestamp: number;
}

export interface PerformanceContext {
  correlationId: string;
  userId?: string;
  endpoint: string;
  method: string;
  startTime: number;
  metrics: PerformanceMetrics;
}

// Performance monitoring class
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private activeContexts: Map<string, PerformanceContext> = new Map();
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start monitoring a request
  startRequest(correlationId: string, endpoint: string, method: string, userId?: string, requestPayload?: any): PerformanceContext {
    const context: PerformanceContext = {
      correlationId,
      userId,
      endpoint,
      method,
      startTime: Date.now(),
      metrics: {
        totalExecutionTime: 0,
        databaseQueryTime: 0,
        externalServiceTime: 0,
        requestPayloadSize: requestPayload ? JSON.stringify(requestPayload).length : 0,
        responsePayloadSize: 0,
        queryCount: 0,
        externalCallCount: 0,
        slowQueries: [],
        externalCalls: []
      }
    };

    this.activeContexts.set(correlationId, context);
    
    logger.info({
      serviceName: 'performance-monitor',
      functionName: 'startRequest',
      userId,
      additionalContext: {
        correlationId,
        endpoint,
        method,
        requestPayloadSize: context.metrics.requestPayloadSize
      }
    }, 'Performance monitoring started');

    return context;
  }

  // Track database query performance
  trackDatabaseQuery(correlationId: string, operation: string, collection: string, query: string, startTime: number): void {
    const context = this.activeContexts.get(correlationId);
    if (!context) return;

    const duration = Date.now() - startTime;
    context.metrics.databaseQueryTime += duration;
    context.metrics.queryCount++;

    // Track slow queries (>100ms)
    if (duration > 100) {
      context.metrics.slowQueries.push({
        query: query.substring(0, 200), // Truncate long queries
        duration,
        collection,
        operation,
        timestamp: startTime
      });
    }

    logger.info({
      serviceName: 'performance-monitor',
      functionName: 'trackDatabaseQuery',
      userId: context.userId,
      additionalContext: {
        correlationId,
        operation,
        collection,
        duration,
        isSlowQuery: duration > 100
      }
    }, `Database query completed: ${operation} on ${collection}`);
  }

  // Track external service call performance
  trackExternalCall(correlationId: string, service: string, endpoint: string, method: string, startTime: number, statusCode?: number): void {
    const context = this.activeContexts.get(correlationId);
    if (!context) return;

    const duration = Date.now() - startTime;
    context.metrics.externalServiceTime += duration;
    context.metrics.externalCallCount++;

    const externalCall: ExternalCall = {
      service,
      endpoint,
      method,
      duration,
      statusCode,
      timestamp: startTime
    };

    context.metrics.externalCalls.push(externalCall);

    logger.info({
      serviceName: 'performance-monitor',
      functionName: 'trackExternalCall',
      userId: context.userId,
      additionalContext: {
        correlationId,
        service,
        endpoint,
        method,
        duration,
        statusCode,
        isSlowCall: duration > 1000
      }
    }, `External service call completed: ${method} ${service}${endpoint}`);
  }

  // Complete request monitoring and log metrics
  completeRequest(correlationId: string, statusCode: number, responsePayload?: any): PerformanceMetrics | null {
    const context = this.activeContexts.get(correlationId);
    if (!context) return null;

    context.metrics.totalExecutionTime = Date.now() - context.startTime;
    context.metrics.responsePayloadSize = responsePayload ? JSON.stringify(responsePayload).length : 0;

    // Calculate percentiles and performance insights
    const insights = this.calculatePerformanceInsights(context.metrics);

    // Log comprehensive performance metrics
    logger.info({
      serviceName: 'performance-monitor',
      functionName: 'completeRequest',
      userId: context.userId,
      additionalContext: {
        correlationId,
        endpoint: context.endpoint,
        method: context.method,
        statusCode,
        metrics: context.metrics,
        insights
      }
    }, 'Request performance monitoring completed');

    // Log performance alerts for slow requests
    if (context.metrics.totalExecutionTime > 5000) {
      logger.warn({
        serviceName: 'performance-monitor',
        functionName: 'completeRequest',
        userId: context.userId,
        additionalContext: {
          correlationId,
          endpoint: context.endpoint,
          totalTime: context.metrics.totalExecutionTime,
          slowQueries: context.metrics.slowQueries,
          externalCalls: context.metrics.externalCalls
        }
      }, 'SLOW REQUEST DETECTED: Request took longer than 5 seconds');
    }

    // Clean up context
    this.activeContexts.delete(correlationId);
    
    return context.metrics;
  }

  // Calculate performance insights
  private calculatePerformanceInsights(metrics: PerformanceMetrics): any {
    const databasePercentage = (metrics.databaseQueryTime / metrics.totalExecutionTime) * 100;
    const externalServicePercentage = (metrics.externalServiceTime / metrics.totalExecutionTime) * 100;
    const applicationLogicTime = metrics.totalExecutionTime - metrics.databaseQueryTime - metrics.externalServiceTime;
    const applicationLogicPercentage = (applicationLogicTime / metrics.totalExecutionTime) * 100;

    return {
      databasePercentage: Math.round(databasePercentage * 100) / 100,
      externalServicePercentage: Math.round(externalServicePercentage * 100) / 100,
      applicationLogicPercentage: Math.round(applicationLogicPercentage * 100) / 100,
      applicationLogicTime,
      averageQueryTime: metrics.queryCount > 0 ? metrics.databaseQueryTime / metrics.queryCount : 0,
      averageExternalCallTime: metrics.externalCallCount > 0 ? metrics.externalServiceTime / metrics.externalCallCount : 0,
      payloadEfficiency: {
        requestSize: metrics.requestPayloadSize,
        responseSize: metrics.responsePayloadSize,
        totalPayloadSize: metrics.requestPayloadSize + metrics.responsePayloadSize
      }
    };
  }

  // Get current metrics for a request (useful for debugging)
  getCurrentMetrics(correlationId: string): PerformanceMetrics | null {
    const context = this.activeContexts.get(correlationId);
    return context ? context.metrics : null;
  }

  // Clean up stale contexts (older than 10 minutes)
  cleanupStaleContexts(): void {
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    
    for (const [correlationId, context] of this.activeContexts.entries()) {
      if (context.startTime < tenMinutesAgo) {
        logger.warn({
          serviceName: 'performance-monitor',
          functionName: 'cleanupStaleContexts',
          additionalContext: {
            correlationId,
            age: Date.now() - context.startTime
          }
        }, 'Cleaning up stale performance monitoring context');
        
        this.activeContexts.delete(correlationId);
      }
    }
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Helper functions for common operations
export function startPerformanceMonitoring(correlationId: string, endpoint: string, method: string, userId?: string, requestPayload?: any): PerformanceContext {
  return performanceMonitor.startRequest(correlationId, endpoint, method, userId, requestPayload);
}

export function trackDatabaseOperation<T>(correlationId: string, operation: string, collection: string, query: string, dbOperation: () => Promise<T>): Promise<T> {
  const startTime = Date.now();
  
  return dbOperation().finally(() => {
    performanceMonitor.trackDatabaseQuery(correlationId, operation, collection, query, startTime);
  });
}

export function trackExternalServiceCall<T>(correlationId: string, service: string, endpoint: string, method: string, serviceCall: () => Promise<T>): Promise<T> {
  const startTime = Date.now();
  
  return serviceCall().then(
    (result) => {
      performanceMonitor.trackExternalCall(correlationId, service, endpoint, method, startTime, 200);
      return result;
    },
    (error) => {
      const statusCode = error?.response?.status || error?.status || 500;
      performanceMonitor.trackExternalCall(correlationId, service, endpoint, method, startTime, statusCode);
      throw error;
    }
  );
}

export function completePerformanceMonitoring(correlationId: string, statusCode: number, responsePayload?: any): PerformanceMetrics | null {
  return performanceMonitor.completeRequest(correlationId, statusCode, responsePayload);
}

// Cleanup interval - run every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    performanceMonitor.cleanupStaleContexts();
  }, 5 * 60 * 1000);
}