/**
 * Admin Subscription Management API
 * GET /api/v1/admin/subscriptions/[userId]
 * PUT /api/v1/admin/subscriptions/[userId]
 * 
 * Manage individual user subscriptions (view and update tier).
 * Admin-only endpoint - requires "admin" custom claim.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { getUserWithClaims } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';
import {
  logAdminAction,
  AuditActionType,
  AuditCategory,
  AuditSeverity,
  getIpAddress,
  getUserAgent,
} from '@/lib/admin-audit-logger';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/v1/admin/subscriptions/[userId]
 * Fetch single user's subscription details
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await context.params;
    console.log('[Admin Subscription API] Get subscription request', { userId });
    
    // Verify admin access
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.authorized) {
      console.log('[Admin Subscription API] Admin check failed', {
        error: adminCheck.error
      });
      return NextResponse.json(
        { error: 'Unauthorized', message: adminCheck.error },
        { status: 403 }
      );
    }
    
    // Fetch user auth data
    const authUser = await getUserWithClaims(userId);
    if (!authUser) {
      console.warn('[Admin Subscription API] User not found', { userId });
      return NextResponse.json(
        { error: 'User not found', message: `No user with ID: ${userId}` },
        { status: 404 }
      );
    }
    
    // Fetch subscription document
    const subscriptionRef = db.collection('subscriptions').doc(userId);
    const subscriptionDoc = await subscriptionRef.get();
    
    const todayUtc = new Date().toISOString().split('T')[0];
    
    const subscription = subscriptionDoc.exists
      ? subscriptionDoc.data()!
      : {
          userId,
          tier: 'free',
          status: 'active',
          aiTestsUsedToday: 0,
          lastResetDate: todayUtc,
          startDate: authUser.metadata.creationTime,
          createdAt: authUser.metadata.creationTime
        };
    
    // Reset counter if new day
    if (subscription.lastResetDate !== todayUtc && subscription.tier === 'free') {
      subscription.aiTestsUsedToday = 0;
      subscription.lastResetDate = todayUtc;
    }
    
    // Calculate remaining tests
    const aiTestsRemaining = subscription.tier === 'premium' ? 'unlimited' :
                              Math.max(0, 5 - (subscription.aiTestsUsedToday || 0));
    
    console.log('[Admin Subscription API] Subscription retrieved', {
      userId,
      tier: subscription.tier,
      remaining: aiTestsRemaining
    });
    
    return NextResponse.json({
      userId,
      email: authUser.email,
      displayName: authUser.displayName,
      subscription: {
        ...subscription,
        aiTestsRemaining,
        dailyLimit: subscription.tier === 'premium' ? 'unlimited' : 5
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[Admin Subscription API] Error fetching subscription', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/admin/subscriptions/[userId]
 * Update user's subscription tier
 * 
 * Request Body:
 * {
 *   tier: 'free' | 'premium',
 *   reason?: string (optional admin note)
 * }
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await context.params;
    console.log('[Admin Subscription API] Update subscription request', { userId });
    
    // Verify admin access and get admin user
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.authorized) {
      console.log('[Admin Subscription API] Admin check failed', {
        error: adminCheck.error
      });
      return NextResponse.json(
        { error: 'Unauthorized', message: adminCheck.error },
        { status: 403 }
      );
    }
    
    // Get admin user ID from request for audit logging
    const { getAuth } = await import('firebase-admin/auth');
    const authInstance = getAuth();
    const authHeader = request.headers.get('Authorization');
    const idToken = authHeader?.split('Bearer ')[1];
    const decodedToken = await authInstance.verifyIdToken(idToken!);
    const adminUserId = decodedToken.uid;
    
    // Parse request body
    const body = await request.json();
    const { tier, reason } = body;
    
    // Validate tier
    if (!tier || !['free', 'premium'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier', message: 'Tier must be "free" or "premium"' },
        { status: 400 }
      );
    }
    
    // Fetch user to ensure they exist
    const authUser = await getUserWithClaims(userId);
    if (!authUser) {
      console.warn('[Admin Subscription API] User not found', { userId });
      return NextResponse.json(
        { error: 'User not found', message: `No user with ID: ${userId}` },
        { status: 404 }
      );
    }
    
    // Fetch current subscription
    const subscriptionRef = db.collection('subscriptions').doc(userId);
    const subscriptionDoc = await subscriptionRef.get();
    
    const todayUtc = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    const currentSubscription = subscriptionDoc.exists
      ? subscriptionDoc.data()!
      : {
          userId,
          tier: 'free',
          status: 'active',
          aiTestsUsedToday: 0,
          lastResetDate: todayUtc,
          startDate: authUser.metadata.creationTime,
          createdAt: authUser.metadata.creationTime
        };
    
    // Check if tier is actually changing
    if (currentSubscription.tier === tier) {
      return NextResponse.json(
        { error: 'No change', message: `User is already on ${tier} tier` },
        { status: 400 }
      );
    }
    
    // Store before state for audit log
    const beforeState = { ...currentSubscription };
    
    // Update subscription
    const updatedSubscription = {
      ...currentSubscription,
      tier,
      status: 'active',
      updatedAt: now,
      modifiedBy: adminUserId,
      // Reset premium fields if downgrading to free
      ...(tier === 'free' ? {
        endDate: null,
        renewalDate: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null
      } : {}),
      // Set premium fields if upgrading
      ...(tier === 'premium' ? {
        startDate: currentSubscription.tier === 'premium' ? currentSubscription.startDate : now,
        // No auto-renewal for manually granted premium
        endDate: null,
        renewalDate: null
      } : {})
    };
    
    // Save updated subscription
    await subscriptionRef.set(updatedSubscription, { merge: true });
    
    console.log('[Admin Subscription API] Subscription tier updated', {
      userId,
      fromTier: beforeState.tier,
      toTier: tier,
      modifiedBy: adminUserId
    });
    
    // Log to audit trail with centralized logger
    await logAdminAction({
      adminUserId,
      adminEmail: decodedToken.email || 'unknown',
      adminRole: decodedToken.superAdmin ? 'superAdmin' : 'admin',
      actionType: AuditActionType.SUBSCRIPTION_TIER_CHANGED,
      actionCategory: AuditCategory.SUBSCRIPTION,
      actionSeverity: AuditSeverity.NOTICE,
      actionDescription: `Changed subscription tier from ${beforeState.tier} to ${tier}`,
      targetUserId: userId,
      targetUserEmail: authUser.email || undefined,
      changes: [
        {
          field: 'tier',
          oldValue: beforeState.tier,
          newValue: tier
        }
      ],
      reason: reason || 'Manual tier change by admin',
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
      apiEndpoint: request.url,
      success: true,
    });
    
    console.log('[Admin Subscription API] Audit log entry created', {
      action: 'subscription_tier_change',
      userId
    });
    
    // Calculate remaining tests for response
    const testsUsed = 'aiTestsUsedToday' in updatedSubscription ? (updatedSubscription as any).aiTestsUsedToday : 0;
    const aiTestsRemaining = tier === 'premium' ? 'unlimited' : Math.max(0, 5 - testsUsed);
    
    return NextResponse.json({
      success: true,
      message: `Subscription tier changed from ${beforeState.tier} to ${tier}`,
      subscription: {
        ...updatedSubscription,
        aiTestsRemaining,
        dailyLimit: tier === 'premium' ? 'unlimited' : 5
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[Admin Subscription API] Error updating subscription', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
