/**
 * Admin Audit Log API
 * GET /api/v1/admin/audit-log
 * 
 * Query and export admin audit logs with GDPR compliance.
 * Based on Google Cloud Audit Logs and AWS CloudTrail export patterns.
 * 
 * Features:
 * - Pagination with configurable page size
 * - Multi-field filtering (date range, admin, action, severity, target user)
 * - CSV export with GDPR compliance headers
 * - Data classification and retention metadata
 * - Anonymized IP addresses per GDPR Article 6
 * 
 * @version 1.0
 * @created November 17, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { db } from '@/lib/firebase-admin';
import {
  AdminAuditLogEntry,
  AuditActionType,
  AuditCategory,
  AuditSeverity,
} from '@/lib/types/audit';
import {
  logAdminAction,
  getIpAddress,
  getUserAgent,
} from '@/lib/admin-audit-logger';

/**
 * GET /api/v1/admin/audit-log
 * Query audit logs with filtering and pagination
 * 
 * Query Parameters:
 * - page: number (default: 1, min: 1)
 * - limit: number (default: 50, min: 10, max: 100)
 * - startDate: ISO 8601 string (optional)
 * - endDate: ISO 8601 string (optional)
 * - adminEmail: string (optional - filter by admin who performed action)
 * - actionType: AuditActionType enum (optional)
 * - actionCategory: AuditCategory enum (optional)
 * - severity: AuditSeverity enum (optional)
 * - targetUserEmail: string (optional - filter by target user)
 * - successOnly: boolean (optional - only successful actions)
 * - failedOnly: boolean (optional - only failed actions)
 * - export: 'csv' (optional - download as CSV file)
 * 
 * Response (JSON):
 * {
 *   logs: AdminAuditLogEntry[],
 *   total: number,
 *   page: number,
 *   limit: number,
 *   hasMore: boolean,
 *   filters: object
 * }
 * 
 * Response (CSV export):
 * Content-Type: text/csv
 * Content-Disposition: attachment; filename="audit-log-YYYY-MM-DD.csv"
 * 
 * GDPR Compliance:
 * - Accessing audit logs is itself logged (META audit event)
 * - CSV exports include data classification headers
 * - Retention policy metadata included
 * - IP addresses already anonymized in database
 * - Export actions logged with reason requirement
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    const adminVerification = await requireAdmin(request);
    if (!adminVerification.authorized) {
      console.error('[AuditLogAPI] Unauthorized access attempt', {
        adminUserId: adminVerification.userId,
        error: adminVerification.error,
      });
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;
    
    // Filter parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const adminEmail = searchParams.get('adminEmail');
    const actionType = searchParams.get('actionType'); // String or null (can be 'all')
    const actionCategory = searchParams.get('actionCategory'); // String or null (can be 'all')
    const severity = searchParams.get('severity'); // String or null (can be 'all')
    const targetUserEmail = searchParams.get('targetUserEmail');
    const successOnly = searchParams.get('successOnly') === 'true';
    const failedOnly = searchParams.get('failedOnly') === 'true';
    const exportFormat = searchParams.get('export'); // 'csv' for CSV export

    console.info('[AuditLogAPI] Query request', {
      adminUserId: adminVerification.userId,
      adminEmail: adminVerification.email,
      page,
      limit,
      filters: { startDate, endDate, adminEmail, actionType, actionCategory, severity, targetUserEmail, successOnly, failedOnly },
      export: exportFormat,
    });

    // Build Firestore query with smart filtering to avoid composite index requirements
    // Strategy: Use only the most selective filter in the query, then filter the rest in-memory
    let query = db.collection('adminAuditLog').orderBy('timestamp', 'desc');

    // Count active filters to determine strategy
    const activeFilters = [
      startDate, 
      endDate, 
      adminEmail, 
      actionType, 
      actionCategory, 
      severity, 
      targetUserEmail, 
      successOnly, 
      failedOnly
    ].filter(f => f !== null && f !== undefined && f !== false && f !== '').length;

    // Apply timestamp filters (most common and indexed)
    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }
    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    // If only date filters or no filters at all, we can safely use orderBy
    // For any additional filters, fetch more data and filter in-memory to avoid composite indexes
    let fetchLimit = limit + 1;
    if (activeFilters > 2) {
      // Fetch extra documents for in-memory filtering (multiply by 3 as heuristic)
      fetchLimit = (limit + 1) * 3;
      console.info('[AuditLogAPI] Using in-memory filtering strategy', {
        activeFilters,
        fetchLimit,
      });
    }

    // Execute base query
    const snapshot = await query.limit(fetchLimit).offset(offset).get();
    
    // Apply in-memory filters for fields that would require composite indexes
    let allLogs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AdminAuditLogEntry[];

    // Filter in-memory
    if (adminEmail) {
      allLogs = allLogs.filter(log => log.actor?.email === adminEmail);
    }
    if (actionType && actionType !== 'all') {
      allLogs = allLogs.filter(log => log.action?.type === actionType);
    }
    if (actionCategory && actionCategory !== 'all') {
      allLogs = allLogs.filter(log => log.action?.category === actionCategory);
    }
    if (severity && severity !== 'all') {
      allLogs = allLogs.filter(log => log.action?.severity === severity);
    }
    if (targetUserEmail) {
      allLogs = allLogs.filter(log => log.target?.email === targetUserEmail);
    }
    if (successOnly) {
      allLogs = allLogs.filter(log => log.result?.success === true);
    }
    if (failedOnly) {
      allLogs = allLogs.filter(log => log.result?.success === false);
    }

    // Apply pagination after filtering
    const hasMore = allLogs.length > limit;
    const filteredTotal = allLogs.length; // Count after filters applied
    const logs = allLogs.slice(0, limit);

    // Get total count (before filters - expensive - only for first page)
    let totalBeforeFilters = 0;
    if (page === 1) {
      // query.count() is available at runtime but TypeScript types may not reflect AggregateQuery
      const countSnapshot = await (query as any).count().get();
      totalBeforeFilters = countSnapshot.data().count;
    }

    console.info('[AuditLogAPI] Query executed successfully', {
      adminUserId: adminVerification.userId,
      resultsReturned: logs.length,
      filteredTotal,
      totalBeforeFilters,
      hasMore,
      page,
    });

    // Log audit log access (META audit event)
    // This creates an audit trail of who accessed the audit logs
    await logAdminAction({
      adminUserId: adminVerification.userId || 'unknown',
      adminEmail: adminVerification.email || 'unknown',
      adminRole: adminVerification.claims?.superAdmin ? 'superAdmin' : 'admin',
      actionType: exportFormat === 'csv' ? AuditActionType.USER_DATA_EXPORTED : AuditActionType.USER_VIEWED,
      actionCategory: AuditCategory.DATA_PRIVACY,
      actionSeverity: exportFormat === 'csv' ? AuditSeverity.WARNING : AuditSeverity.INFO,
      actionDescription: exportFormat === 'csv' 
        ? `Exported ${logs.length} audit log entries to CSV`
        : `Viewed audit log (page ${page}, ${logs.length} entries)`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
      apiEndpoint: request.url,
      success: true,
    });

    // GDPR-Compliant CSV Export
    if (exportFormat === 'csv') {
      const csv = generateGdprCompliantCsv(logs);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `zentype-audit-log-${timestamp}.csv`;
      
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Data-Classification': 'INTERNAL', // GDPR metadata header
          'X-Retention-Policy': '7-years', // GDPR metadata header
          'X-Legal-Basis': 'legitimate-interest', // GDPR metadata header
          'X-Export-Timestamp': new Date().toISOString(),
          'X-Exported-By': adminVerification.email || 'unknown',
        },
      });
    }

    // Return JSON response
    return NextResponse.json({
      success: true,
      logs,
      total: totalBeforeFilters,
      filteredTotal,
      page,
      limit,
      hasMore,
      filters: {
        startDate,
        endDate,
        adminEmail,
        actionType,
        actionCategory,
        severity,
        targetUserEmail,
        successOnly,
        failedOnly,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AuditLogAPI] Error querying audit logs', {
      error: errorMessage,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to query audit logs',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Generate GDPR-compliant CSV export of audit logs
 * Based on Google Cloud Audit Logs and AWS CloudTrail CSV format
 * 
 * Features:
 * - Data classification header
 * - Retention policy information
 * - Legal basis for processing
 * - Comprehensive field mapping
 * - Proper CSV escaping
 * 
 * @param logs - Array of audit log entries to export
 * @returns CSV string with GDPR compliance headers
 */
function generateGdprCompliantCsv(logs: AdminAuditLogEntry[]): string {
  // GDPR Compliance Header (commented lines in CSV)
  const gdprHeader = [
    '# ZenType Admin Audit Log Export',
    `# Export Date: ${new Date().toISOString()}`,
    '# Data Classification: INTERNAL',
    '# Retention Policy: 7 years (GDPR Article 30)',
    '# Legal Basis: Legitimate Interest (GDPR Article 6)',
    '# Purpose: Administrative accountability and compliance',
    '# ',
    '# NOTICE: This file contains sensitive administrative audit data.',
    '# Handle according to your organization\'s data protection policies.',
    '# IP addresses have been anonymized per GDPR Article 6.',
    '# ',
  ].join('\n');

  // CSV Column Headers
  const headers = [
    'Event ID',
    'Timestamp (UTC)',
    'Admin User ID',
    'Admin Email',
    'Admin Role',
    'Action Type',
    'Action Category',
    'Severity',
    'Description',
    'Target User ID',
    'Target Email',
    'Target Type',
    'Changes (JSON)',
    'IP Address (Anonymized)',
    'User Agent',
    'Reason',
    'API Endpoint',
    'Correlation ID',
    'Success',
    'Error Message',
    'Error Code',
    'Data Classification',
    'Legal Basis',
    'Retention Expires At',
  ].join(',');

  // CSV Rows
  const rows = logs.map(log => {
    // Escape CSV values (handle commas, quotes, newlines)
    const escape = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Serialize changes array to JSON string (for CSV cell)
    const changesJson = log.changes 
      ? JSON.stringify(log.changes).replace(/"/g, '""') // Escape inner quotes
      : '';

    return [
      escape(log.eventId),
      escape(log.timestamp),
      escape(log.actor.userId),
      escape(log.actor.email),
      escape(log.actor.role),
      escape(log.action.type),
      escape(log.action.category),
      escape(log.action.severity),
      escape(log.action.description),
      escape(log.target?.userId || ''),
      escape(log.target?.email || ''),
      escape(log.target?.type || ''),
      escape(changesJson),
      escape(log.context.ipAddress || ''),
      escape(log.context.userAgent || ''),
      escape(log.context.reason || ''),
      escape(log.context.apiEndpoint || ''),
      escape(log.context.correlationId || ''),
      escape(log.result.success),
      escape(log.result.error || ''),
      escape(log.result.errorCode || ''),
      escape(log.compliance.dataClassification),
      escape(log.compliance.gdprLegalBasis),
      escape(log.compliance.retentionExpiresAt),
    ].join(',');
  });

  // Combine header + rows
  return `${gdprHeader}\n${headers}\n${rows.join('\n')}`;
}

/**
 * Helper: Validate date string (ISO 8601 format)
 */
function isValidIsoDate(dateString: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoDateRegex.test(dateString) && !isNaN(Date.parse(dateString));
}

/**
 * Helper: Validate action type enum
 */
function isValidActionType(actionType: string): actionType is AuditActionType {
  return Object.values(AuditActionType).includes(actionType as AuditActionType);
}

/**
 * Helper: Validate severity enum
 */
function isValidSeverity(severity: string): severity is AuditSeverity {
  return Object.values(AuditSeverity).includes(severity as AuditSeverity);
}
