import * as logger from 'firebase-functions/logger';

export interface LogEntry {
  timestamp: string; // ISO 8601 format
  correlationId?: string;
  serviceName: string;
  userId?: string;
  functionName: string;
  requestMethod?: string;
  requestPath?: string;
  responseStatusCode?: number;
  executionTimeMs?: number;
  errorDetails?: {
    message: string;
    stack?: string;
    code?: string;
    details?: any;
  };
  additionalContext?: Record<string, any>;
}

export interface LogContext {
  serviceName: string;
  functionName: string;
  userId?: string;
  correlationId?: string;
  requestMethod?: string;
  requestPath?: string;
  additionalContext?: Record<string, any>;
}

export class FirebaseStructuredLogger {
  private static instance: FirebaseStructuredLogger;
  
  static getInstance(): FirebaseStructuredLogger {
    if (!FirebaseStructuredLogger.instance) {
      FirebaseStructuredLogger.instance = new FirebaseStructuredLogger();
    }
    return FirebaseStructuredLogger.instance;
  }

  private createBaseLogEntry(context: LogContext): Omit<LogEntry, 'executionTimeMs' | 'responseStatusCode' | 'errorDetails'> {
    return {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      serviceName: context.serviceName,
      userId: context.userId,
      functionName: context.functionName,
      requestMethod: context.requestMethod,
      requestPath: context.requestPath,
      additionalContext: context.additionalContext
    };
  }

  info(context: LogContext, message: string, additionalData?: Record<string, any>): void {
    const logEntry: LogEntry = {
      ...this.createBaseLogEntry(context),
      additionalContext: {
        ...context.additionalContext,
        message,
        level: 'info',
        ...additionalData
      }
    };
    
    logger.info(JSON.stringify(logEntry));
  }

  warn(context: LogContext, message: string, additionalData?: Record<string, any>): void {
    const logEntry: LogEntry = {
      ...this.createBaseLogEntry(context),
      additionalContext: {
        ...context.additionalContext,
        message,
        level: 'warn',
        ...additionalData
      }
    };
    
    logger.warn(JSON.stringify(logEntry));
  }

  error(context: LogContext, error: Error | string, additionalData?: Record<string, any>): void {
    const errorDetails = typeof error === 'string' 
      ? { message: error }
      : {
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
          details: (error as any).details
        };

    const logEntry: LogEntry = {
      ...this.createBaseLogEntry(context),
      errorDetails,
      additionalContext: {
        ...context.additionalContext,
        level: 'error',
        ...additionalData
      }
    };
    
    logger.error(JSON.stringify(logEntry));
  }

  logFunction(context: LogContext, startTime: number, success: boolean, additionalData?: Record<string, any>): void {
    const executionTimeMs = Date.now() - startTime;
    
    const logEntry: LogEntry = {
      ...this.createBaseLogEntry(context),
      executionTimeMs,
      additionalContext: {
        ...context.additionalContext,
        level: 'function_execution',
        success,
        ...additionalData
      }
    };
    
    logger.info(JSON.stringify(logEntry));
  }
}

// Convenience functions for common use cases
export const firebaseLogger = FirebaseStructuredLogger.getInstance();

// Helper function to create timing context
export function createTimingContext(): { startTime: number } {
  return { startTime: Date.now() };
}

// Helper function for Firebase function logging
export function createFirebaseContext(functionName: string, userId?: string, correlationId?: string): LogContext {
  return {
    serviceName: `firebase-function-${functionName}`,
    functionName,
    userId,
    correlationId
  };
}

// Helper function for AI service logging within Firebase functions
export function createAiContext(functionName: string, userId?: string, correlationId?: string): LogContext {
  return {
    serviceName: 'ai-service',
    functionName,
    userId,
    correlationId
  };
}