import fs from 'fs';
import os from 'os';
import path from 'path';

export interface PerformanceLogEntry {
  timestamp: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  memoryUsage?: number;
  cpuUsage?: number;
  correlationId: string;
  userId?: string;
  errorMessage?: string;
  databaseTime?: number;
  queryCount?: number;
  slowQueries?: Array<{
    query: string;
    duration: number;
    collection?: string;
    operation: string;
  }>;
}

class PerformanceLogger {
  private static instance: PerformanceLogger;
  private logDir: string;
  private currentLogFile: string;
  private fileLoggingEnabled: boolean;
  
  constructor() {
    this.logDir = path.join(process.cwd(), 'log', 'performance');
    this.fileLoggingEnabled = this.ensureLogDirectory(this.logDir);

    // Cloud Run's root filesystem is read-only for app-owned paths.
    if (!this.fileLoggingEnabled) {
      const fallbackDir = path.join(os.tmpdir(), 'zentype', 'performance');
      this.logDir = fallbackDir;
      this.fileLoggingEnabled = this.ensureLogDirectory(this.logDir);
    }

    if (!this.fileLoggingEnabled) {
      console.warn('Performance logger disabled: no writable log directory available.');
    }

    this.currentLogFile = this.getCurrentLogFile();
  }
  
  static getInstance(): PerformanceLogger {
    if (!PerformanceLogger.instance) {
      PerformanceLogger.instance = new PerformanceLogger();
    }
    return PerformanceLogger.instance;
  }
  
  private ensureLogDirectory(dirPath: string): boolean {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.accessSync(dirPath, fs.constants.W_OK);
      return true;
    } catch (error) {
      console.warn(`Performance logger cannot use directory ${dirPath}:`, error);
      return false;
    }
  }
  
  private getCurrentLogFile(): string {
    if (!this.fileLoggingEnabled) {
      return '';
    }
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `performance-${today}.jsonl`);
  }
  
  log(entry: PerformanceLogEntry): void {
    if (!this.fileLoggingEnabled || !this.currentLogFile) {
      return;
    }

    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.currentLogFile, logLine);
    } catch (error) {
      console.error('Failed to write performance log:', error);
    }
  }
  
  async getLogs(options: {
    startTime?: string;
    endTime?: string;
    endpoint?: string;
    limit?: number;
  } = {}): Promise<PerformanceLogEntry[]> {
    try {
      if (!this.fileLoggingEnabled || !this.currentLogFile) {
        return [];
      }

      const { startTime, endTime, endpoint, limit = 100 } = options;
      
      // Read current day's log file
      if (!fs.existsSync(this.currentLogFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.currentLogFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      let logs: PerformanceLogEntry[] = [];
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as PerformanceLogEntry;
          
          // Apply filters
          if (startTime && entry.timestamp < startTime) continue;
          if (endTime && entry.timestamp > endTime) continue;
          if (endpoint && !entry.endpoint.includes(endpoint)) continue;
          
          logs.push(entry);
        } catch (parseError) {
          console.warn('Failed to parse log line:', line);
        }
      }
      
      // Sort by timestamp (newest first) and limit
      return logs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
        
    } catch (error) {
      console.error('Failed to read performance logs:', error);
      return [];
    }
  }
  
  async getStats(timeRange: string = '1h'): Promise<{
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    slowRequestCount: number;
    avgDatabaseTime: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>;
    errorsByEndpoint: Array<{ endpoint: string; errorCount: number; errorRate: number }>;
    requestVolumeOverTime: Array<{ timestamp: string; count: number; errorCount: number }>;
    responseTimeOverTime: Array<{ timestamp: string; avgTime: number; p95Time: number; p99Time: number }>;
    slowestQueries: Array<{ query: string; avgDuration: number; count: number; collection?: string }>;
    databaseTimeOverTime: Array<{ timestamp: string; avgDbTime: number; queryCount: number }>;
  }> {
    try {
      const logs = await this.getLogs({ limit: 1000 });
      
      if (logs.length === 0) {
        return {
        totalRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        slowRequestCount: 0,
        avgDatabaseTime: 0,
        slowestEndpoints: [],
        errorsByEndpoint: [],
        requestVolumeOverTime: [],
        responseTimeOverTime: [],
        slowestQueries: [],
        databaseTimeOverTime: []
      };
      }
      
      const totalRequests = logs.length;
      const responseTimes = logs.map(log => log.responseTime).sort((a, b) => a - b);
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;
      const errorCount = logs.filter(log => log.statusCode >= 400).length;
      const errorRate = (errorCount / totalRequests) * 100;
      
      // Calculate percentiles
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p99Index = Math.floor(responseTimes.length * 0.99);
      const p95ResponseTime = responseTimes[p95Index] || 0;
      const p99ResponseTime = responseTimes[p99Index] || 0;
      
      // Calculate slow requests (>2000ms)
      const slowRequestCount = logs.filter(log => log.responseTime > 2000).length;
      
      // Group by endpoint for analysis
      const endpointStats = new Map<string, { times: number[]; errors: number; total: number }>();
      
      logs.forEach(log => {
        const key = `${log.method} ${log.endpoint}`;
        if (!endpointStats.has(key)) {
          endpointStats.set(key, { times: [], errors: 0, total: 0 });
        }
        const stats = endpointStats.get(key)!;
        stats.times.push(log.responseTime);
        stats.total++;
        if (log.statusCode >= 400) {
          stats.errors++;
        }
      });
      
      // Calculate slowest endpoints
      const slowestEndpoints = Array.from(endpointStats.entries())
        .map(([endpoint, stats]) => ({
          endpoint,
          avgTime: stats.times.reduce((sum, time) => sum + time, 0) / stats.times.length,
          count: stats.total
        }))
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 5);
      
      // Calculate errors by endpoint
      const errorsByEndpoint = Array.from(endpointStats.entries())
        .filter(([, stats]) => stats.errors > 0)
        .map(([endpoint, stats]) => ({
          endpoint,
          errorCount: stats.errors,
          errorRate: (stats.errors / stats.total) * 100
        }))
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 5);
      
      // Calculate time-based metrics for volume and response time tracking
      const requestVolumeOverTime = this.calculateVolumeOverTime(logs, timeRange);
      const responseTimeOverTime = this.calculateResponseTimeOverTime(logs, timeRange);
      const slowestQueries = this.calculateSlowestQueries(logs);
      const databaseTimeOverTime = this.calculateDatabaseTimeOverTime(logs, timeRange);
      
      // Calculate average database time
      const dbTimes = logs.filter(log => log.databaseTime && log.databaseTime > 0).map(log => log.databaseTime!);
      const avgDatabaseTime = dbTimes.length > 0 ? dbTimes.reduce((sum, time) => sum + time, 0) / dbTimes.length : 0;

      return {
        totalRequests,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        p95ResponseTime: Math.round(p95ResponseTime),
        p99ResponseTime: Math.round(p99ResponseTime),
        slowRequestCount,
        avgDatabaseTime: Math.round(avgDatabaseTime),
        slowestEndpoints,
        errorsByEndpoint,
        requestVolumeOverTime,
        responseTimeOverTime,
        slowestQueries,
        databaseTimeOverTime
      };
      
    } catch (error) {
      console.error('Failed to calculate performance stats:', error);
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        slowRequestCount: 0,
        avgDatabaseTime: 0,
        slowestEndpoints: [],
        errorsByEndpoint: [],
        requestVolumeOverTime: [],
        responseTimeOverTime: [],
        slowestQueries: [],
        databaseTimeOverTime: []
      };
    }
  }

  private calculateVolumeOverTime(logs: PerformanceLogEntry[], timeRange: string): Array<{ timestamp: string; count: number; errorCount: number }> {
    const intervalMinutes = this.getIntervalMinutes(timeRange);
    const buckets = new Map<string, { count: number; errorCount: number }>();
    
    logs.forEach(log => {
      const timestamp = new Date(log.timestamp);
      const bucketTime = new Date(Math.floor(timestamp.getTime() / (intervalMinutes * 60 * 1000)) * (intervalMinutes * 60 * 1000));
      const bucketKey = bucketTime.toISOString();
      
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, { count: 0, errorCount: 0 });
      }
      
      const bucket = buckets.get(bucketKey)!;
      bucket.count++;
      if (log.statusCode >= 400) {
        bucket.errorCount++;
      }
    });
    
    return Array.from(buckets.entries())
      .map(([timestamp, data]) => ({ timestamp, ...data }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private calculateResponseTimeOverTime(logs: PerformanceLogEntry[], timeRange: string): Array<{ timestamp: string; avgTime: number; p95Time: number; p99Time: number }> {
    const intervalMinutes = this.getIntervalMinutes(timeRange);
    const buckets = new Map<string, number[]>();
    
    logs.forEach(log => {
      const timestamp = new Date(log.timestamp);
      const bucketTime = new Date(Math.floor(timestamp.getTime() / (intervalMinutes * 60 * 1000)) * (intervalMinutes * 60 * 1000));
      const bucketKey = bucketTime.toISOString();
      
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      
      buckets.get(bucketKey)!.push(log.responseTime);
    });
    
    return Array.from(buckets.entries())
      .map(([timestamp, times]) => {
        const sortedTimes = times.sort((a, b) => a - b);
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const p95Index = Math.floor(sortedTimes.length * 0.95);
        const p99Index = Math.floor(sortedTimes.length * 0.99);
        
        return {
          timestamp,
          avgTime: Math.round(avgTime),
          p95Time: Math.round(sortedTimes[p95Index] || 0),
          p99Time: Math.round(sortedTimes[p99Index] || 0)
        };
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private getIntervalMinutes(timeRange: string): number {
    switch (timeRange) {
      case '15m': return 1;   // 1-minute intervals for 15 minutes
      case '1h': return 5;    // 5-minute intervals for 1 hour
      case '6h': return 15;   // 15-minute intervals for 6 hours
      case '24h': return 60;  // 1-hour intervals for 24 hours
      case '7d': return 360;  // 6-hour intervals for 7 days
      default: return 5;      // Default to 5-minute intervals
    }
  }

  private calculateSlowestQueries(logs: PerformanceLogEntry[]): Array<{ query: string; avgDuration: number; count: number; collection?: string }> {
    const queryMap = new Map<string, { totalDuration: number; count: number; collection?: string }>();
    
    logs.forEach(log => {
      if (log.slowQueries && log.slowQueries.length > 0) {
        log.slowQueries.forEach(slowQuery => {
          const key = `${slowQuery.operation}:${slowQuery.collection || 'unknown'}:${slowQuery.query.substring(0, 100)}`;
          const existing = queryMap.get(key);
          
          if (existing) {
            existing.totalDuration += slowQuery.duration;
            existing.count += 1;
          } else {
            queryMap.set(key, {
              totalDuration: slowQuery.duration,
              count: 1,
              collection: slowQuery.collection
            });
          }
        });
      }
    });
    
    return Array.from(queryMap.entries())
      .map(([query, data]) => ({
        query: query.split(':')[2] || query, // Extract query part
        avgDuration: Math.round(data.totalDuration / data.count),
        count: data.count,
        collection: data.collection
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10); // Top 10 slowest queries
  }

  private calculateDatabaseTimeOverTime(logs: PerformanceLogEntry[], timeRange: string): Array<{ timestamp: string; avgDbTime: number; queryCount: number }> {
    const intervalMinutes = this.getIntervalMinutes(timeRange);
    const intervalMs = intervalMinutes * 60 * 1000;
    const now = Date.now();
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const startTime = now - timeRangeMs;
    
    const intervals = new Map<number, { totalDbTime: number; totalQueries: number; count: number }>();
    
    logs.forEach(log => {
      const logTime = new Date(log.timestamp).getTime();
      if (logTime >= startTime && log.databaseTime !== undefined && log.queryCount !== undefined) {
        const intervalStart = Math.floor((logTime - startTime) / intervalMs) * intervalMs + startTime;
        const existing = intervals.get(intervalStart);
        
        if (existing) {
          existing.totalDbTime += log.databaseTime;
          existing.totalQueries += log.queryCount;
          existing.count += 1;
        } else {
          intervals.set(intervalStart, {
            totalDbTime: log.databaseTime,
            totalQueries: log.queryCount,
            count: 1
          });
        }
      }
    });
    
    return Array.from(intervals.entries())
      .map(([timestamp, data]) => ({
        timestamp: new Date(timestamp).toISOString(),
        avgDbTime: Math.round(data.totalDbTime / data.count),
        queryCount: Math.round(data.totalQueries / data.count)
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private getTimeRangeMs(timeRange: string): number {
    switch (timeRange) {
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }
}

export const performanceLogger = PerformanceLogger.getInstance();