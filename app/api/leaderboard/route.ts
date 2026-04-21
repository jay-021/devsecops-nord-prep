import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { withPerformanceMonitoring } from '@/src/lib/performance-middleware';
import { logger, createApiContext, createTimingContext } from '@/lib/structured-logger';
import { CORRELATION_ID_HEADER } from '@/lib/correlation-id';

interface LeaderboardEntry {
  rank: number;
  username: string;
  bestWpm: number;
  testsCompleted: number;
  averageAccuracy: number;
  userId: string;
  email?: string;
  avgWpm: number;
  testType?: string;
  lastTestDate?: Date;
}

interface LeaderboardFilters {
  testType?: 'ai' | 'practice' | 'all';
  timeframe?: 'week' | 'month' | 'all-time';
  limit?: number;
}

async function handleGET(request: NextRequest) {
  const { startTime } = createTimingContext();
  const context = createApiContext(request, 'GET /api/leaderboard');
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) || `leaderboard-${Date.now()}`;
  
  try {
    logger.info(context, 'Leaderboard API called', { 
      correlationId,
      timestamp: new Date().toISOString()
    });

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const filters: LeaderboardFilters = {
      testType: (searchParams.get('testType') as 'ai' | 'practice' | 'all') || 'all',
      timeframe: (searchParams.get('timeframe') as 'week' | 'month' | 'all-time') || 'all-time',
      limit: parseInt(searchParams.get('limit') || '100')
    };

    logger.info(context, 'Leaderboard filters applied', { 
      correlationId,
      filters
    });

    // Primary data source: profiles collection (contains richer data)
    let leaderboardData: LeaderboardEntry[] = [];
    let dataSource = 'profiles';
    
    try {
      // Determine which collection to query based on timeframe
      let collectionName = 'profiles';
      let orderByField = 'stats.avgWpm';
      
      // Use dedicated timeframe collections for better performance
      if (filters.timeframe === 'week') {
        collectionName = 'leaderboard_weekly';
        orderByField = 'avgWpm';
        dataSource = 'leaderboard_weekly';
      } else if (filters.timeframe === 'month') {
        collectionName = 'leaderboard_monthly';
        orderByField = 'avgWpm';
        dataSource = 'leaderboard_monthly';
      }
      // For 'all-time' or undefined timeframe, use profiles collection (default behavior)
      
      // Build query for the selected collection
      let query = db.collection(collectionName).orderBy(orderByField, 'desc');

      // Apply limit
      if (filters.limit && filters.limit > 0) {
        query = query.limit(Math.min(filters.limit, 100));
      }

      const snapshot = await query.get();
      
      if (!snapshot.empty) {
        let rank = 1;
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Handle different data structures based on collection
          let stats, username, email, userId, avgWpm, bestWpm, avgAcc, testsCompleted, lastTestDate;
          
          if (collectionName === 'profiles') {
            stats = data.stats || {};
            username = data.username;
            email = data.email;
            userId = doc.id;
            avgWpm = stats.avgWpm;
            bestWpm = stats.bestWpm || stats.avgWpm;
            avgAcc = stats.avgAcc;
            testsCompleted = stats.testsCompleted;
            lastTestDate = data.updatedAt || data.createdAt;
          } else {
            // leaderboard collections have flat structure
            username = data.username;
            email = data.email;
            userId = data.userId || doc.id;
            avgWpm = data.avgWpm;
            bestWpm = data.bestWpm || data.avgWpm;
            avgAcc = data.avgAcc;
            testsCompleted = data.testsCompleted;
            lastTestDate = data.lastTestDate || data.updatedAt;
          }
          
          // Only include entries with meaningful stats
          if (avgWpm && avgWpm > 0 && testsCompleted && testsCompleted > 0) {
            leaderboardData.push({
              rank,
              username: username || 'Anonymous',
              bestWpm: bestWpm,
              testsCompleted: testsCompleted,
              averageAccuracy: avgAcc || 0,
              userId: userId,
              email: email,
              avgWpm: avgWpm,
              testType: data.testType || 'all',
              lastTestDate: lastTestDate
            });
            rank++;
          }
        });
      }
      
      logger.info(context, `Successfully fetched leaderboard from ${collectionName} collection`, {
        correlationId,
        entriesFound: leaderboardData.length,
        dataSource,
        timeframe: filters.timeframe
      });
      
    } catch (profilesError) {
      logger.warn(context, 'Failed to fetch from profiles collection, trying leaderboard fallback', {
        correlationId,
        error: profilesError instanceof Error ? profilesError.message : String(profilesError)
      });
      
      // Fallback to leaderboard collection if profiles fails
      dataSource = 'leaderboard';
      try {
        let fallbackQuery = db.collection('leaderboard').orderBy('avgWpm', 'desc');
        
        if (filters.limit && filters.limit > 0) {
          fallbackQuery = fallbackQuery.limit(Math.min(filters.limit, 100));
        }

        const leaderboardSnapshot = await fallbackQuery.get();
        
        if (!leaderboardSnapshot.empty) {
          let rank = 1;
          leaderboardSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.avgWpm && data.avgWpm > 0 && data.testsCompleted && data.testsCompleted > 0) {
              leaderboardData.push({
                rank,
                username: data.username || 'Anonymous',
                bestWpm: data.bestWpm || data.avgWpm,
                testsCompleted: data.testsCompleted,
                averageAccuracy: data.avgAcc || 0,
                userId: doc.id,
                email: data.email,
                avgWpm: data.avgWpm,
                testType: data.testType,
                lastTestDate: data.lastTestDate
              });
              rank++;
            }
          });
        }
      } catch (fallbackError) {
        logger.error(context, fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)), {
          correlationId,
          step: 'LEADERBOARD_FALLBACK_ERROR'
        });
      }
    }

    logger.info(context, 'Leaderboard data retrieved successfully', { 
      correlationId,
      count: leaderboardData.length,
      filters,
      dataSource
    });

    const response = NextResponse.json({
      leaderboard: leaderboardData,
      filters,
      count: leaderboardData.length,
      dataSource,
      correlationId
    });
    response.headers.set(CORRELATION_ID_HEADER, correlationId);
    
    logger.logRequest(context, startTime, 200, { 
      count: leaderboardData.length,
      filters,
      dataSource,
      timeframe: filters.timeframe,
      endpoint: '/api/leaderboard'
    });
    return response;

  } catch (error) {
    logger.error(context, error instanceof Error ? error : new Error(String(error)), {
      correlationId,
      step: 'LEADERBOARD_FETCH_ERROR'
    });
    
    const errorResponse = NextResponse.json({
      error: 'Failed to fetch leaderboard data',
      details: error instanceof Error ? error.message : 'Unknown error',
      leaderboard: [],
      correlationId
    }, { status: 500 });
    errorResponse.headers.set(CORRELATION_ID_HEADER, correlationId);
    
    logger.logRequest(context, startTime, 500, { 
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return errorResponse;
  }
}

// Export wrapped handler with performance monitoring
export const GET = withPerformanceMonitoring(handleGET, {
  enablePayloadTracking: false,
  slowRequestThreshold: 1000
});