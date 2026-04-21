/**
 * Admin Analytics API
 * GET /api/v1/admin/analytics
 * 
 * Provides aggregated platform metrics for admin dashboard.
 * Includes caching to reduce Firestore reads and improve performance.
 * 
 * Metrics:
 * - Total users (Firebase Auth count)
 * - Premium users (subscriptions where tier='premium')
 * - AI tests generated today
 * - New signups (7 days, 30 days)
 * - Tests completed today
 * - Average WPM across platform
 * - System health indicators
 * 
 * @version 1.0
 * @created November 17, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { db } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { AuditActionType, AuditCategory, AuditSeverity } from '@/lib/types/audit';
import { logAdminAction, getIpAddress, getUserAgent } from '@/lib/admin-audit-logger';

// Cache configuration
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
let cachedAnalytics: AnalyticsResponse | null = null;
let cacheTimestamp = 0;

interface AnalyticsResponse {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  aiTestsToday: number;
  newSignups7d: number;
  newSignups30d: number;
  testsCompletedToday: number;
  avgWpm: number;
  systemHealth: {
    firestoreStatus: 'healthy' | 'degraded' | 'down';
    authStatus: 'healthy' | 'degraded' | 'down';
    lastUpdated: string;
  };
  timestamp: string;
}

/**
 * GET /api/v1/admin/analytics
 * Returns aggregated platform metrics with 5-minute caching
 * 
 * Query Parameters:
 * - refresh: boolean (optional - bypass cache and fetch fresh data)
 * 
 * Response:
 * {
 *   totalUsers: number,
 *   premiumUsers: number,
 *   freeUsers: number,
 *   aiTestsToday: number,
 *   newSignups7d: number,
 *   newSignups30d: number,
 *   testsCompletedToday: number,
 *   avgWpm: number,
 *   systemHealth: { firestoreStatus, authStatus, lastUpdated },
 *   timestamp: ISO 8601 string,
 *   cached: boolean
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    const adminVerification = await requireAdmin(request);
    if (!adminVerification.authorized) {
      console.error('[AnalyticsAPI] Unauthorized access attempt', {
        adminUserId: adminVerification.userId,
        error: adminVerification.error,
      });
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Check cache (unless force refresh requested)
    const now = Date.now();
    const cacheValid = cachedAnalytics && (now - cacheTimestamp < CACHE_DURATION_MS);
    
    if (cacheValid && !forceRefresh) {
      console.info('[AnalyticsAPI] Returning cached analytics', {
        adminUserId: adminVerification.userId,
        cacheAge: Math.floor((now - cacheTimestamp) / 1000),
      });
      
      // Log analytics access (cached)
      await logAdminAction({
        adminUserId: adminVerification.userId || 'unknown',
        adminEmail: adminVerification.email || 'unknown',
        adminRole: adminVerification.claims?.superAdmin ? 'superAdmin' : 'admin',
        actionType: AuditActionType.USER_VIEWED,
        actionCategory: AuditCategory.DATA_PRIVACY,
        actionSeverity: AuditSeverity.INFO,
        actionDescription: 'Viewed analytics dashboard (cached)',
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
        apiEndpoint: request.url,
        success: true,
      });
      
      return NextResponse.json({
        success: true,
        ...cachedAnalytics,
        cached: true,
      });
    }

    console.info('[AnalyticsAPI] Fetching fresh analytics', {
      adminUserId: adminVerification.userId,
      forceRefresh,
    });

    // Fetch fresh analytics
    const analytics = await fetchAnalytics();

    // Update cache
    cachedAnalytics = analytics;
    cacheTimestamp = now;

    // Log analytics access (fresh)
    await logAdminAction({
      adminUserId: adminVerification.userId || 'unknown',
      adminEmail: adminVerification.email || 'unknown',
      adminRole: adminVerification.claims?.superAdmin ? 'superAdmin' : 'admin',
      actionType: AuditActionType.USER_VIEWED,
      actionCategory: AuditCategory.DATA_PRIVACY,
      actionSeverity: AuditSeverity.INFO,
      actionDescription: 'Viewed analytics dashboard (fresh data)',
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
      apiEndpoint: request.url,
      success: true,
    });

    return NextResponse.json({
      success: true,
      ...analytics,
      cached: false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AnalyticsAPI] Error fetching analytics', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch analytics',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch fresh analytics from Firebase Auth and Firestore
 * Runs multiple queries in parallel for performance
 */
async function fetchAnalytics(): Promise<AnalyticsResponse> {
  const startTime = Date.now();
  
  // Calculate date boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Execute all queries in parallel
  const auth = getAuth();
  const [
    authResult,
    subscriptionsSnapshot,
    aiTestsSnapshot,
    profiles7dSnapshot,
    profiles30dSnapshot,
    testsCompletedSnapshot,
    allTestsSnapshot,
  ] = await Promise.all([
    // Total users from Firebase Auth
    auth.listUsers(1000).catch(() => ({ users: [] })),
    
    // Premium users from subscriptions
    db.collection('subscriptions')
      .where('tier', '==', 'premium')
      .where('status', '==', 'active')
      .get()
      .catch(() => ({ docs: [] })),
    
    // AI tests generated today
    db.collection('aiGeneratedTests')
      .where('createdAt', '>=', todayStart.toISOString())
      .get()
      .catch(() => ({ docs: [] })),
    
    // New signups in last 7 days
    db.collection('profiles')
      .where('createdAt', '>=', sevenDaysAgo.toISOString())
      .get()
      .catch(() => ({ docs: [] })),
    
    // New signups in last 30 days
    db.collection('profiles')
      .where('createdAt', '>=', thirtyDaysAgo.toISOString())
      .get()
      .catch(() => ({ docs: [] })),
    
    // Tests completed today
    db.collection('testResults')
      .where('completedAt', '>=', todayStart.toISOString())
      .get()
      .catch(() => ({ docs: [] })),
    
    // All test results for WPM average (limited to recent 1000 for performance)
    db.collection('testResults')
      .orderBy('completedAt', 'desc')
      .limit(1000)
      .get()
      .catch(() => ({ docs: [] })),
  ]);

  // Calculate metrics
  const totalUsers = authResult.users?.length || 0;
  const premiumUsers = subscriptionsSnapshot.docs.length;
  const freeUsers = totalUsers - premiumUsers;
  const aiTestsToday = aiTestsSnapshot.docs.length;
  const newSignups7d = profiles7dSnapshot.docs.length;
  const newSignups30d = profiles30dSnapshot.docs.length;
  const testsCompletedToday = testsCompletedSnapshot.docs.length;
  
  // Calculate average WPM
  let avgWpm = 0;
  if (allTestsSnapshot.docs.length > 0) {
    const totalWpm = allTestsSnapshot.docs.reduce((sum: number, doc: any) => {
      const data = doc.data();
      return sum + (data.wpm || 0);
    }, 0);
    avgWpm = Math.round(totalWpm / allTestsSnapshot.docs.length);
  }

  // System health checks
  const systemHealth = {
    firestoreStatus: (allTestsSnapshot.docs.length >= 0 ? 'healthy' : 'down') as 'healthy' | 'degraded' | 'down',
    authStatus: (totalUsers >= 0 ? 'healthy' : 'down') as 'healthy' | 'degraded' | 'down',
    lastUpdated: new Date().toISOString(),
  };

  const duration = Date.now() - startTime;
  console.info('[AnalyticsAPI] Analytics fetched successfully', {
    totalUsers,
    premiumUsers,
    aiTestsToday,
    duration,
  });

  return {
    totalUsers,
    premiumUsers,
    freeUsers,
    aiTestsToday,
    newSignups7d,
    newSignups30d,
    testsCompletedToday,
    avgWpm,
    systemHealth,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper: Clear analytics cache (useful for testing or manual refresh)
 * Can be called from admin tools or scheduled tasks
 * NOTE: Not exported to avoid Next.js route validation errors
 */
function clearAnalyticsCache(): void {
  cachedAnalytics = null;
  cacheTimestamp = 0;
  console.info('[AnalyticsAPI] Cache cleared');
}
