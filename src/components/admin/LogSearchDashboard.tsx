'use client';

import React, { useState, useEffect } from 'react';
import { Search, Calendar, User, Hash, AlertCircle, Clock, Filter } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  message: string;
  correlationId?: string;
  userId?: string;
  source: string;
  service: string;
  environment: string;
  requestId?: string;
  statusCode?: number;
  method?: string;
  path?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface LogSearchFilters {
  correlationId: string;
  userId: string;
  startTime: string;
  endTime: string;
  severity: string;
  source: string;
  service: string;
  searchText: string;
}

const LogSearchDashboard: React.FC = () => {
  const [filters, setFilters] = useState<LogSearchFilters>({
    correlationId: '',
    userId: '',
    startTime: '',
    endTime: '',
    severity: '',
    source: '',
    service: '',
    searchText: '',
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Set default time range to last 24 hours
  useEffect(() => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    setFilters(prev => ({
      ...prev,
      startTime: yesterday.toISOString().slice(0, 16),
      endTime: now.toISOString().slice(0, 16),
    }));
  }, []);

  const searchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      // Add non-empty filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value.trim()) {
          queryParams.append(key, value.trim());
        }
      });
      
      queryParams.append('page', currentPage.toString());
      queryParams.append('pageSize', pageSize.toString());

      const response = await fetch(`/api/v1/admin/logs/search?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotalResults(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search logs');
      setLogs([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof LogSearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    setFilters({
      correlationId: '',
      userId: '',
      startTime: yesterday.toISOString().slice(0, 16),
      endTime: now.toISOString().slice(0, 16),
      severity: '',
      source: '',
      service: '',
      searchText: '',
    });
    setCurrentPage(1);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'ERROR': return 'text-red-600 bg-red-50';
      case 'WARNING': return 'text-yellow-600 bg-yellow-50';
      case 'INFO': return 'text-blue-600 bg-blue-50';
      case 'DEBUG': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  };

  const totalPages = Math.ceil(totalResults / pageSize);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Log Search Dashboard</h1>
          <p className="text-gray-600">Search and analyze application logs across all services</p>
        </div>

        {/* Search Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Correlation ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Hash className="inline w-4 h-4 mr-1" />
                Correlation ID
              </label>
              <input
                type="text"
                value={filters.correlationId}
                onChange={(e) => handleFilterChange('correlationId', e.target.value)}
                placeholder="Enter correlation ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* User ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline w-4 h-4 mr-1" />
                User ID
              </label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="Enter user ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <AlertCircle className="inline w-4 h-4 mr-1" />
                Severity
              </label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Severities</option>
                <option value="ERROR">Error</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
                <option value="DEBUG">Debug</option>
              </select>
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Filter className="inline w-4 h-4 mr-1" />
                Source
              </label>
              <select
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sources</option>
                <option value="nextjs">Next.js</option>
                <option value="firebase">Firebase</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                Start Time
              </label>
              <input
                type="datetime-local"
                value={filters.startTime}
                onChange={(e) => handleFilterChange('startTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                End Time
              </label>
              <input
                type="datetime-local"
                value={filters.endTime}
                onChange={(e) => handleFilterChange('endTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Search Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Search className="inline w-4 h-4 mr-1" />
                Search Text
              </label>
              <input
                type="text"
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                placeholder="Search in log messages"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={searchLogs}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Search Logs'}
            </button>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Clear Filters
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Search Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Results Summary */}
        {totalResults > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-4 h-4" />
                <span>Found {totalResults.toLocaleString()} log entries</span>
              </div>
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          </div>
        )}

        {/* Log Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {logs.length === 0 && !loading ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No logs found. Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map((log, index) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                        {log.severity}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      {log.correlationId && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                          {log.correlationId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{log.source}</span>
                      <span>•</span>
                      <span>{log.service}</span>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <p className="text-gray-900 font-mono text-sm">{log.message}</p>
                  </div>

                  {(log.method || log.path || log.statusCode || log.duration) && (
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      {log.method && <span className="font-medium">{log.method}</span>}
                      {log.path && <span>{log.path}</span>}
                      {log.statusCode && (
                        <span className={log.statusCode >= 400 ? 'text-red-600' : 'text-green-600'}>
                          {log.statusCode}
                        </span>
                      )}
                      {log.duration && <span>{log.duration}ms</span>}
                    </div>
                  )}

                  {log.error && (
                    <div className="mt-2 p-3 bg-red-50 rounded border border-red-200">
                      <p className="text-red-800 font-medium text-sm">{log.error.name}: {log.error.message}</p>
                      {log.error.stack && (
                        <pre className="text-xs text-red-700 mt-2 overflow-x-auto">{log.error.stack}</pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogSearchDashboard;