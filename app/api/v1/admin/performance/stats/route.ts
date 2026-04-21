import { NextRequest, NextResponse } from 'next/server';
import { performanceLogger } from '@/lib/performance-logger';
import { withPerformanceMonitoring } from '@/src/lib/performance-middleware';

async function handleGET(request: NextRequest) {
  console.log("Admin performance stats API v1 called");
  
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '1h';
    
    console.log('Getting performance stats for time range:', timeRange);
    
    // Get performance statistics
    const stats = await performanceLogger.getStats(timeRange);
    
    return NextResponse.json({
      success: true,
      data: {
        totalRequests: stats.totalRequests,
        avgResponseTime: stats.avgResponseTime,
        errorRate: stats.errorRate,
        avgDatabaseTime: stats.avgDatabaseTime || 0,
        p95ResponseTime: stats.p95ResponseTime || 0,
        p99ResponseTime: stats.p99ResponseTime || 0,
        slowRequestCount: stats.slowRequestCount || 0,
        slowestEndpoints: stats.slowestEndpoints,
        errorsByEndpoint: stats.errorsByEndpoint,
        requestVolumeOverTime: stats.requestVolumeOverTime,
        responseTimeOverTime: stats.responseTimeOverTime,
        slowestQueries: stats.slowestQueries,
        databaseTimeOverTime: stats.databaseTimeOverTime
      },
      message: "Performance statistics retrieved successfully"
    });
    
  } catch (error) {
    console.error('Error retrieving performance stats:', error);
    return NextResponse.json({
      success: false,
      data: {
        totalRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        avgDatabaseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        slowRequestCount: 0,
        slowestEndpoints: [],
        errorsByEndpoint: [],
        requestVolumeOverTime: [],
        responseTimeOverTime: [],
        slowestQueries: [],
        databaseTimeOverTime: []
      },
      message: "Failed to retrieve performance statistics"
    }, { status: 500 });
  }
}

// Export wrapped handler
export const GET = withPerformanceMonitoring(handleGET, {
  enablePayloadTracking: false,
  slowRequestThreshold: 500
});