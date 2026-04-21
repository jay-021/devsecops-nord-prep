import { NextRequest, NextResponse } from 'next/server';
import { performanceLogger } from '@/lib/performance-logger';
import { withPerformanceMonitoring } from '@/src/lib/performance-middleware';

async function handleGET(request: NextRequest) {
  console.log("Admin logs search API v1 called");
  
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const searchText = searchParams.get('searchText');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');
    
    console.log('Query params:', { startTime, endTime, searchText, pageSize });
    
    // Get real performance logs
    const performanceLogs = await performanceLogger.getLogs({
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      endpoint: searchText || undefined,
      limit: pageSize
    });
    
    // Transform to expected format
    const logs = performanceLogs.map(log => ({
      timestamp: log.timestamp,
      message: log.errorMessage || `${log.method} ${log.endpoint} completed`,
      performanceMetrics: {
        responseTime: log.responseTime,
        memoryUsage: log.memoryUsage || 0,
        cpuUsage: 0 // Not tracked yet
      },
      correlationId: log.correlationId,
      endpoint: log.endpoint,
      method: log.method,
      statusCode: log.statusCode,
      userId: log.userId
    }));
    
    return NextResponse.json({
      success: true,
      logs,
      totalCount: logs.length,
      message: "Performance logs retrieved successfully"
    });
    
  } catch (error) {
    console.error('Error retrieving performance logs:', error);
    return NextResponse.json({
      success: false,
      logs: [],
      totalCount: 0,
      message: "Failed to retrieve performance logs"
    }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  console.log("Minimal POST handler for /api/v1/admin/logs/search was reached!");
  return new NextResponse(
    JSON.stringify({ message: "POST Success from minimal route handler" }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

// Export wrapped handlers
export const GET = withPerformanceMonitoring(handleGET, {
  enablePayloadTracking: false,
  slowRequestThreshold: 500
});

export const POST = withPerformanceMonitoring(handlePOST, {
  enablePayloadTracking: true,
  slowRequestThreshold: 1000
});