import * as admin from 'firebase-admin';
import { FirebaseFunctionsRateLimiter } from 'firebase-functions-rate-limiter';
import { HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();

// Rate limiter configurations
const rateLimiters = {
  // AI Test Generation: 5 requests per minute per user
  generateAiTest: FirebaseFunctionsRateLimiter.withFirestoreBackend({
    name: 'generate_ai_test_limiter',
    maxCalls: 5,
    periodSeconds: 60,
  }, firestore),

  // Test Result Submission: 100 requests per minute per user  
  submitTestResult: FirebaseFunctionsRateLimiter.withFirestoreBackend({
    name: 'submit_test_result_limiter',
    maxCalls: 100,
    periodSeconds: 60,
  }, firestore),

  // Authentication endpoints: 10 requests per minute per IP
  auth: FirebaseFunctionsRateLimiter.withFirestoreBackend({
    name: 'auth_limiter',
    maxCalls: 10,
    periodSeconds: 60,
  }, firestore),
};

/**
 * Check rate limit for a specific function and user/IP
 * @param functionName - The name of the function to check rate limit for
 * @param identifier - User ID or IP address to identify the requester
 * @throws HttpsError if rate limit is exceeded
 */
export async function checkRateLimit(functionName: keyof typeof rateLimiters, identifier: string): Promise<void> {
  try {
    const limiter = rateLimiters[functionName];
    if (!limiter) {
      logger.warn(`Rate limiter not found for function: ${functionName}`);
      return;
    }

    const qualifier = `${functionName}_${identifier}`;
    const isQuotaExceeded = await limiter.isQuotaExceededOrRecordUsage(qualifier);
    
    if (isQuotaExceeded) {
      logger.warn(`Rate limit exceeded for ${functionName} by ${identifier}`);
      throw new HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Please try again later.`
      );
    }

    logger.info(`Rate limit check passed for ${functionName} by ${identifier}`);
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    
    logger.error(`Rate limit check failed for ${functionName}:`, error);
    // Don't block the request if rate limiting fails
    logger.warn(`Allowing request to proceed despite rate limit check failure`);
  }
}

/**
 * Get rate limit status for a user without consuming a request
 * @param limiterName - The name of the rate limiter to check
 * @param identifier - The identifier to check status for
 */
export async function getRateLimitStatus(
  limiterName: keyof typeof rateLimiters,
  identifier: string
): Promise<{
  isExceeded: boolean;
  resetTime: Date;
} | null> {
  const limiter = rateLimiters[limiterName];
  
  if (!limiter) {
    return null;
  }

  try {
    const qualifier = `${limiterName}_${identifier}`;
    const isExceeded = await limiter.isQuotaAlreadyExceeded(qualifier);
    
    return {
      isExceeded,
      resetTime: new Date(Date.now() + 60000) // Approximate reset time based on period
    };
  } catch (error) {
    logger.error('Failed to get rate limit status', {
      limiterName,
      identifier,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}