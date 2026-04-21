/**
 * Admin Subscriptions API
 * GET /api/v1/admin/subscriptions
 * 
 * List all user subscriptions with pagination, search, and filtering.
 * Admin-only endpoint - requires "admin" custom claim.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { listUsers } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';

/**
 * GET /api/v1/admin/subscriptions
 * List all subscriptions with optional filtering
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 50, max: 100)
 * - tier: Filter by tier (free, premium)
 * - search: Search by email or user ID
 * 
 * Response:
 * - 200: { subscriptions: [...], pagination: { page, limit, total, hasMore } }
 * - 403: { error: "Unauthorized" }
 * - 500: { error: "Internal server error" }
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Admin Subscriptions API] List subscriptions request received');
    
    // Verify admin access
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.authorized) {
      console.log('[Admin Subscriptions API] Admin check failed', {
        error: adminCheck.error
      });
      return NextResponse.json(
        { error: 'Unauthorized', message: adminCheck.error },
        { status: 403 }
      );
    }
    
    console.log('[Admin Subscriptions API] Admin check passed', {
      userId: adminCheck.userId,
      email: adminCheck.email
    });
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const tierFilter = searchParams.get('tier') as 'free' | 'premium' | null;
    const searchQuery = searchParams.get('search')?.toLowerCase() || '';
    
    console.log('[Admin Subscriptions API] Query parameters', {
      page,
      limit,
      tierFilter,
      searchQuery
    });
    
    // Fetch Firebase Auth users (first page only for performance)
    const authUsersResult = await listUsers(undefined, 100);
    
    if (!authUsersResult || !authUsersResult.users) {
      console.error('[Admin Subscriptions API] Failed to fetch users from Firebase Auth');
      return NextResponse.json(
        { error: 'Failed to fetch users', message: 'Unable to fetch users from Firebase Auth' },
        { status: 500 }
      );
    }
    
    const authUsers = authUsersResult.users;
    
    console.log('[Admin Subscriptions API] Auth users loaded', {
      count: authUsers.length
    });
    
    // Fetch all subscription documents
    const subscriptionsRef = db.collection('subscriptions');
    let subscriptionsQuery = subscriptionsRef;
    
    // Apply tier filter if specified
    if (tierFilter) {
      subscriptionsQuery = subscriptionsQuery.where('tier', '==', tierFilter) as any;
    }
    
    const subscriptionsSnapshot = await subscriptionsQuery.get();
    const subscriptionsMap = new Map();
    
    // Check for counter reset (new day in UTC)
    const todayUtc = new Date().toISOString().split('T')[0];
    
    subscriptionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Reset counter if new day
      if (data.lastResetDate !== todayUtc && data.tier === 'free') {
        data.aiTestsUsedToday = 0;
        data.lastResetDate = todayUtc;
      }
      
      subscriptionsMap.set(doc.id, {
        userId: doc.id,
        ...data,
        // Calculate remaining tests for display
        aiTestsRemaining: data.tier === 'premium' ? 'unlimited' : 
                          Math.max(0, 5 - (data.aiTestsUsedToday || 0))
      });
    });
    
    console.log('[Admin Subscriptions API] Subscriptions loaded', {
      count: subscriptionsMap.size
    });
    
    // Combine auth users with subscription data
    const enrichedSubscriptions = authUsers.map(authUser => {
      const subscription = subscriptionsMap.get(authUser.uid) || {
        userId: authUser.uid,
        tier: 'free',
        status: 'active',
        aiTestsUsedToday: 0,
        lastResetDate: todayUtc,
        aiTestsRemaining: 5,
        startDate: authUser.metadata.creationTime,
        createdAt: authUser.metadata.creationTime
      };
      
      return {
        userId: authUser.uid,
        email: authUser.email || 'No email',
        displayName: authUser.displayName || null,
        photoURL: authUser.photoURL || null,
        createdAt: authUser.metadata.creationTime,
        lastSignIn: authUser.metadata.lastSignInTime,
        emailVerified: authUser.emailVerified,
        disabled: authUser.disabled,
        subscription
      };
    });
    
    // Apply search filter if specified
    let filteredSubscriptions = enrichedSubscriptions;
    if (searchQuery) {
      filteredSubscriptions = filteredSubscriptions.filter(user => 
        user.email.toLowerCase().includes(searchQuery) ||
        user.userId.toLowerCase().includes(searchQuery) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchQuery))
      );
    }
    
    // Sort by creation time (newest first)
    filteredSubscriptions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Apply pagination
    const total = filteredSubscriptions.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSubscriptions = filteredSubscriptions.slice(startIndex, endIndex);
    const hasMore = endIndex < total;
    
    console.log('[Admin Subscriptions API] Subscriptions retrieved successfully', {
      total,
      page,
      limit,
      returned: paginatedSubscriptions.length,
      hasMore
    });
    
    return NextResponse.json({
      subscriptions: paginatedSubscriptions,
      pagination: {
        page,
        limit,
        total,
        hasMore,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[Admin Subscriptions API] Error fetching subscriptions', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
