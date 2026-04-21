/**
 * User Subscription API
 * GET /api/v1/user/subscription
 * 
 * Returns current user's subscription status, tier, and remaining AI tests.
 * Used by client-side to display subscription info and limits.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

/**
 * GET /api/v1/user/subscription
 * Fetch current user's subscription status
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[UserSubscriptionAPI] Missing or invalid Authorization header');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication token required' },
        { status: 401 }
      );
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    // Get auth instance
    const { getAuth } = await import('firebase-admin/auth');
    const authInstance = getAuth();
    
    try {
      decodedToken = await authInstance.verifyIdToken(idToken);
    } catch (error) {
      console.warn('[UserSubscriptionAPI] Invalid ID token', {
        error: error instanceof Error ? error.message : String(error)
      });
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    const userId = decodedToken.uid;
    
    // 2. Fetch subscription document
    const subscriptionRef = db.collection('subscriptions').doc(userId);
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
    
    // 3. Check if counter needs reset (new day in UTC)
    const todayUtc = new Date().toISOString().split('T')[0];
    const needsReset = subscription.lastResetDate !== todayUtc;
    
    if (needsReset) {
      console.log('[UserSubscriptionAPI] Resetting daily counter for new day', {
        userId,
        previousDate: subscription.lastResetDate,
        currentDate: todayUtc,
        previousCount: subscription.aiTestsUsedToday
      });
      subscription.aiTestsUsedToday = 0;
      subscription.lastResetDate = todayUtc;
    }
    
    // 4. Calculate remaining tests based on tier
    const FREE_TIER_DAILY_LIMIT = 5;
    
    let response;
    
    if (subscription.tier === 'premium' && subscription.status === 'active') {
      // Premium users have unlimited access
      response = {
        userId,
        tier: 'premium',
        status: subscription.status,
        aiTestsUsedToday: 0, // Not tracked for premium
        aiTestsRemaining: 'unlimited',
        dailyLimit: 'unlimited',
        nextResetDate: getNextMidnightUtc().toISOString(),
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        renewalDate: subscription.renewalDate
      };
    } else {
      // Free tier - calculate remaining
      const remaining = Math.max(0, FREE_TIER_DAILY_LIMIT - subscription.aiTestsUsedToday);
      
      response = {
        userId,
        tier: 'free',
        status: subscription.status || 'active',
        aiTestsUsedToday: subscription.aiTestsUsedToday,
        aiTestsRemaining: remaining,
        dailyLimit: FREE_TIER_DAILY_LIMIT,
        nextResetDate: getNextMidnightUtc().toISOString(),
        startDate: subscription.startDate
      };
    }
    
    console.log('[UserSubscriptionAPI] Subscription status retrieved', {
      userId,
      tier: response.tier,
      remaining: response.aiTestsRemaining
    });
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('[UserSubscriptionAPI] Error fetching subscription', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}

/**
 * Get next midnight UTC timestamp for counter reset
 */
function getNextMidnightUtc(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}
