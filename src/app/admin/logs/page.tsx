import React from 'react';
import LogSearchDashboard from '@/src/components/admin/LogSearchDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log Search Dashboard - ZenType Admin',
  description: 'Search and analyze application logs across all services',
  robots: 'noindex, nofollow', // Prevent search engine indexing of admin pages
};

/**
 * Admin Log Search Page
 * 
 * Provides a comprehensive interface for searching and analyzing logs
 * from Google Cloud Logging with correlation ID tracking and filtering.
 * 
 * Features:
 * - Search by correlation ID, user ID, time range
 * - Filter by severity, source, service
 * - Full-text search in log messages
 * - Pagination for large result sets
 * - Real-time log analysis and debugging
 */
export default function AdminLogsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <LogSearchDashboard />
    </div>
  );
}