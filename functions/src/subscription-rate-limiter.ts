/**
 * Subscription-based Rate Limiter for AI Test Generation
 * 
 * This module enforces subscription tier limits on AI test generation:
 * - Free tier: 5 AI tests per day (resets at midnight UTC)
 * - Premium tier: Unlimited AI tests
 * 
 * The rate limiter integrates with Firestore subscriptions collection
 * and automatically resets daily counters.
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

const firestore = getFirestore();

/**
 * Daily AI test limit for free tier users
 */
const FREE_TIER_DAILY_LIMIT = 5;

/**
 * Check if user has exceeded their daily AI test generation limit.
 * Throws HttpsError if limit is reached for free tier users.
 * Premium users have unlimited access.
 * 
 * @param userId - Firebase UID of the user
 * @throws {HttpsError} resource-exhausted - If free tier limit is reached
 * 
 * @example
 * ```typescript
 * // In cloud function:
 * await checkAiTestLimit(userId);  // Throws if limit exceeded
 * ```
 */
export async function checkAiTestLimit(userId: string): Promise<void> {
  try {
    // 1. Fetch user's subscription document
    const subscriptionRef = firestore.collection('subscriptions').doc(userId);
    const subscriptionDoc = await subscriptionRef.get();
    
    // Default to free tier if no subscription exists
    const subscription = subscriptionDoc.exists 
      ? subscriptionDoc.data()! 
      : {
          userId,
          tier: 'free',
          status: 'active',
          aiTestsUsedToday: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
          startDate: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
    
    // 2. Check if we need to reset the daily counter (new day in UTC)
    const todayUtc = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const needsReset = subscription.lastResetDate !== todayUtc;
    
    if (needsReset) {
      console.log('[SubscriptionRateLimiter] Resetting daily counter', {
        userId,
        previousDate: subscription.lastResetDate,
        currentDate: todayUtc,
        previousCount: subscription.aiTestsUsedToday
      });
      
      subscription.aiTestsUsedToday = 0;
      subscription.lastResetDate = todayUtc;
    }
    
    // 3. Premium users have unlimited access - allow immediately
    if (subscription.tier === 'premium' && subscription.status === 'active') {
      logger.info('[SubscriptionRateLimiter] Premium user - unlimited access', {
        userId,
        tier: subscription.tier
      });
      return;
    }
    
    // 4. Check free tier limit
    if (subscription.aiTestsUsedToday >= FREE_TIER_DAILY_LIMIT) {
      logger.warn('[SubscriptionRateLimiter] Daily limit reached', {
        userId,
        tier: subscription.tier,
        limit: FREE_TIER_DAILY_LIMIT,
        used: subscription.aiTestsUsedToday
      });
      
      throw new HttpsError(
        'resource-exhausted',
        'Daily AI test limit reached. Upgrade to Premium for unlimited tests.',
        {
          limit: FREE_TIER_DAILY_LIMIT,
          used: subscription.aiTestsUsedToday,
          remaining: 0,
          tier: 'free',
          upgradeUrl: '/pricing',
          resetDate: todayUtc,
          nextResetTimestamp: getNextMidnightUtc().toISOString()
        }
      );
    }
    
    // 5. Increment counter and save to Firestore
    const newCount = subscription.aiTestsUsedToday + 1;
    
    await subscriptionRef.set({
      userId: subscription.userId,
      tier: subscription.tier,
      status: subscription.status || 'active',
      aiTestsUsedToday: newCount,
      lastResetDate: todayUtc,
      startDate: subscription.startDate,
      createdAt: subscription.createdAt,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    logger.info('[SubscriptionRateLimiter] AI test limit check passed', {
      userId,
      tier: subscription.tier,
      used: newCount,
      limit: FREE_TIER_DAILY_LIMIT,
      remaining: FREE_TIER_DAILY_LIMIT - newCount
    });
    
  } catch (error) {
    // Re-throw HttpsError (rate limit exceeded)
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // Log unexpected errors
    logger.error('[SubscriptionRateLimiter] Unexpected error checking AI test limit', {
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Fail open - allow request if subscription check fails
    // (Better to allow than to block legitimate users due to infrastructure issues)
    logger.warn('[SubscriptionRateLimiter] Failing open due to error - allowing request');
  }
}

/**
 * Get the next midnight UTC timestamp for counter reset
 */
function getNextMidnightUtc(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Get current subscription status for a user
 * Used by client-side to display remaining tests
 * 
 * @param userId - Firebase UID
 * @returns Subscription status with remaining tests
 */
export async function getUserSubscriptionStatus(userId: string): Promise<{
  tier: 'free' | 'premium';
  status: string;
  aiTestsUsedToday: number;
  aiTestsRemaining: number | 'unlimited';
  dailyLimit: number | 'unlimited';
  nextResetDate: string;
}> {
  try {
    const subscriptionRef = firestore.collection('subscriptions').doc(userId);
    const subscriptionDoc = await subscriptionRef.get();
    
    // Default to free tier
    const subscription = subscriptionDoc.exists
      ? subscriptionDoc.data()!
      : {
          tier: 'free',
          status: 'active',
          aiTestsUsedToday: 0,
          lastResetDate: new Date().toISOString().split('T')[0]
        };
    
    // Reset counter if new day
    const todayUtc = new Date().toISOString().split('T')[0];
    if (subscription.lastResetDate !== todayUtc) {
      subscription.aiTestsUsedToday = 0;
      subscription.lastResetDate = todayUtc;
    }
    
    // Premium tier - unlimited
    if (subscription.tier === 'premium' && subscription.status === 'active') {
      return {
        tier: 'premium',
        status: subscription.status,
        aiTestsUsedToday: 0, // Not tracked for premium
        aiTestsRemaining: 'unlimited',
        dailyLimit: 'unlimited',
        nextResetDate: todayUtc
      };
    }
    
    // Free tier - calculate remaining
    const remaining = Math.max(0, FREE_TIER_DAILY_LIMIT - subscription.aiTestsUsedToday);
    
    return {
      tier: 'free',
      status: subscription.status || 'active',
      aiTestsUsedToday: subscription.aiTestsUsedToday,
      aiTestsRemaining: remaining,
      dailyLimit: FREE_TIER_DAILY_LIMIT,
      nextResetDate: getNextMidnightUtc().toISOString()
    };
    
  } catch (error) {
    logger.error('[SubscriptionRateLimiter] Error fetching subscription status', {
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return default free tier on error
    return {
      tier: 'free',
      status: 'active',
      aiTestsUsedToday: 0,
      aiTestsRemaining: FREE_TIER_DAILY_LIMIT,
      dailyLimit: FREE_TIER_DAILY_LIMIT,
      nextResetDate: getNextMidnightUtc().toISOString()
    };
  }
}
