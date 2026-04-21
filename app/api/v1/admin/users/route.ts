// app/api/v1/admin/users/route.ts
// Admin user management API - List all users with search/filter/pagination
// Created: November 17, 2025

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { listUsers, getUserWithClaims } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';

/**
 * GET /api/v1/admin/users
 * List all users with pagination, search, and filtering
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 50, max: 100)
 * - search: Search by email or username
 * - tier: Filter by subscription tier (free, premium)
 * - orderBy: Sort field (createdAt, email)
 * - order: Sort direction (asc, desc)
 * 
 * Response:
 * - 200: { users: [...], pagination: { page, limit, total, hasMore } }
 * - 403: { error: "Unauthorized" }
 * - 500: { error: "Internal server error" }
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Admin Users API] List users request received');
    
    // Verify admin access
    const auth = await requireAdmin(request);
    
    if (!auth.authorized) {
      console.warn('[Admin Users API] Unauthorized access attempt', { error: auth.error });
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const searchQuery = searchParams.get('search')?.toLowerCase() || '';
    const tierFilter = searchParams.get('tier') || '';

    console.log('[Admin Users API] Query params', { page, limit, searchQuery, tierFilter });

    // Fetch users from Firebase Auth
    const usersResult = await listUsers(undefined, 1000); // Fetch up to 1000 users
    
    if (!usersResult) {
      throw new Error('Failed to fetch users from Firebase Auth');
    }

    console.log('[Admin Users API] Fetched users from Auth', { count: usersResult.users.length });

    // Fetch all user profiles and subscriptions in parallel
    const enrichedUsersPromises = usersResult.users.map(async (authUser) => {
      try {
        // Fetch profile data
        let profile = null;
        if (db) {
          const profileDoc = await db.collection('profiles').doc(authUser.uid).get();
          if (profileDoc.exists) {
            profile = profileDoc.data();
          }
        }

        // Fetch subscription data
        let subscription = null;
        if (db) {
          const subscriptionDoc = await db.collection('subscriptions').doc(authUser.uid).get();
          if (subscriptionDoc.exists) {
            subscription = subscriptionDoc.data();
          } else {
            // Create default free subscription if doesn't exist
            subscription = {
              userId: authUser.uid,
              tier: 'free',
              status: 'active',
              aiTestsUsedToday: 0,
              aiTestDailyLimit: 5,
              aiTestResetDate: new Date().toISOString(),
              startDate: authUser.metadata.creationTime || new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
        }

        return {
          uid: authUser.uid,
          email: authUser.email || '',
          displayName: authUser.displayName || profile?.username || 'Unknown',
          photoURL: authUser.photoURL || null,
          emailVerified: authUser.emailVerified,
          disabled: authUser.disabled,
          createdAt: authUser.metadata.creationTime || new Date().toISOString(),
          lastSignInAt: authUser.metadata.lastSignInTime || null,
          customClaims: authUser.customClaims || {},
          profile: profile ? {
            username: profile.username || 'Unknown',
            bio: profile.bio || '',
            stats: profile.stats || { rank: 'E', testsCompleted: 0, avgWpm: 0, avgAcc: 0 },
          } : null,
          subscription: subscription ? {
            tier: subscription.tier || 'free',
            status: subscription.status || 'active',
            aiTestsUsedToday: subscription.aiTestsUsedToday || 0,
            aiTestDailyLimit: subscription.aiTestDailyLimit || 5,
          } : null,
        };
      } catch (error) {
        console.error(`[Admin Users API] Error enriching user ${authUser.uid}:`, error);
        return {
          uid: authUser.uid,
          email: authUser.email || '',
          displayName: authUser.displayName || 'Unknown',
          photoURL: authUser.photoURL || null,
          emailVerified: authUser.emailVerified,
          disabled: authUser.disabled,
          createdAt: authUser.metadata.creationTime || new Date().toISOString(),
          lastSignInAt: authUser.metadata.lastSignInTime || null,
          customClaims: authUser.customClaims || {},
          profile: null,
          subscription: null,
        };
      }
    });

    const enrichedUsers = await Promise.all(enrichedUsersPromises);

    console.log('[Admin Users API] Enriched users with profiles and subscriptions', { 
      count: enrichedUsers.length 
    });

    // Apply search filter
    let filteredUsers = enrichedUsers;
    if (searchQuery) {
      filteredUsers = enrichedUsers.filter(user => {
        const email = user.email.toLowerCase();
        const displayName = user.displayName.toLowerCase();
        const username = user.profile?.username.toLowerCase() || '';
        
        return email.includes(searchQuery) || 
               displayName.includes(searchQuery) || 
               username.includes(searchQuery) ||
               user.uid.toLowerCase().includes(searchQuery);
      });
      console.log('[Admin Users API] After search filter', { count: filteredUsers.length });
    }

    // Apply tier filter
    if (tierFilter && (tierFilter === 'free' || tierFilter === 'premium')) {
      filteredUsers = filteredUsers.filter(user => 
        user.subscription?.tier === tierFilter
      );
      console.log('[Admin Users API] After tier filter', { count: filteredUsers.length });
    }

    // Sort by creation date (newest first)
    filteredUsers.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    // Apply pagination
    const total = filteredUsers.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    const hasMore = endIndex < total;

    console.log('[Admin Users API] Pagination applied', {
      total,
      page,
      limit,
      startIndex,
      endIndex,
      returned: paginatedUsers.length,
      hasMore,
    });

    return NextResponse.json({
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore,
      },
    });
  } catch (error) {
    console.error('[Admin Users API] Error listing users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
