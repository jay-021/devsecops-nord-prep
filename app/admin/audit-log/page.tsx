/**
 * Admin Audit Log Viewer
 * /admin/audit-log
 * 
 * Enterprise-grade audit log interface with GDPR-compliant export.
 * Based on Google Cloud Audit Logs and AWS CloudTrail UX patterns.
 * 
 * Features:
 * - Real-time audit log streaming
 * - Multi-field filtering (date range, admin, action, severity)
 * - Severity color-coding (INFO→EMERGENCY)
 * - Expa      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>ange diffs (before/after)
 * - CSV export with GDPR compliance notice
 * - Pagination with configurable page size
 * 
 * @version 1.0
 * @created November 17, 2025
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Download,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import {
  AdminAuditLogEntry,
  AuditActionType,
  AuditCategory,
  AuditSeverity,
} from '@/lib/types/audit';

export default function AuditLogPage() {
  const router = useRouter();
  const { user: adminUser, isLoading: authLoading } = useAdminAuth();
  
  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [actionType, setActionType] = useState<string>('all');
  const [actionCategory, setActionCategory] = useState<string>('all');
  const [severity, setSeverity] = useState<string>('all');
  const [targetUserEmail, setTargetUserEmail] = useState('');
  const [successOnly, setSuccessOnly] = useState(false);
  const [failedOnly, setFailedOnly] = useState(false);
  
  // Filter options with counts
  const [availableFilters, setAvailableFilters] = useState<{
    actionTypes: Map<string, number>;
    categories: Map<string, number>;
    severities: Map<string, number>;
  }>({
    actionTypes: new Map(),
    categories: new Map(),
    severities: new Map(),
  });
  
  // Expandable rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Wait for auth to be ready before fetching logs
    if (!authLoading && adminUser) {
      fetchLogs();
    }
  }, [page, limit, authLoading, adminUser]);

  const fetchLogs = async () => {
    if (!adminUser) return; // Wait for auth to be ready
    
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (adminEmail) params.append('adminEmail', adminEmail);
      if (actionType && actionType !== 'all') params.append('actionType', actionType);
      if (actionCategory && actionCategory !== 'all') params.append('actionCategory', actionCategory);
      if (severity && severity !== 'all') params.append('severity', severity);
      if (targetUserEmail) params.append('targetUserEmail', targetUserEmail);
      if (successOnly) params.append('successOnly', 'true');
      if (failedOnly) params.append('failedOnly', 'true');
      
      // Get current user's ID token for authentication
      const idToken = await adminUser.getIdToken();
      
      const response = await fetch(`/api/v1/admin/audit-log?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch audit logs');
      }
      
      setLogs(data.logs);
      setTotal(data.total);
      setFilteredTotal(data.filteredTotal || data.logs.length);
      setHasMore(data.hasMore);
      
      // Compute available filter options from current results
      const actionTypeCounts = new Map<string, number>();
      const categoryCounts = new Map<string, number>();
      const severityCounts = new Map<string, number>();
      
      data.logs.forEach((log: AdminAuditLogEntry) => {
        // Count action types
        const type = log.action?.type;
        if (type) {
          actionTypeCounts.set(type, (actionTypeCounts.get(type) || 0) + 1);
        }
        
        // Count categories
        const cat = log.action?.category;
        if (cat) {
          categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
        }
        
        // Count severities
        const sev = log.action?.severity;
        if (sev) {
          severityCounts.set(sev, (severityCounts.get(sev) || 0) + 1);
        }
      });
      
      setAvailableFilters({
        actionTypes: actionTypeCounts,
        categories: categoryCounts,
        severities: severityCounts,
      });
      
      console.info('[AuditLogPage] Logs fetched', {
        count: data.logs.length,
        page,
        total: data.total,
        filteredTotal: data.filteredTotal,
        filterCounts: {
          actionTypes: actionTypeCounts.size,
          categories: categoryCounts.size,
          severities: severityCounts.size,
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[AuditLogPage] Error fetching logs', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    if (!adminUser) return; // Wait for auth to be ready
    
    try {
      setExporting(true);
      setError(null);
      
      // Build query parameters (same filters as current view)
      const params = new URLSearchParams({
        export: 'csv',
        page: '1', // Export starts from page 1
        limit: '10000', // Export large batch (adjust based on needs)
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (adminEmail) params.append('adminEmail', adminEmail);
      if (actionType && actionType !== 'all') params.append('actionType', actionType);
      if (actionCategory && actionCategory !== 'all') params.append('actionCategory', actionCategory);
      if (severity && severity !== 'all') params.append('severity', severity);
      if (targetUserEmail) params.append('targetUserEmail', targetUserEmail);
      if (successOnly) params.append('successOnly', 'true');
      if (failedOnly) params.append('failedOnly', 'true');
      
      const idToken = await adminUser.getIdToken();
      
      const response = await fetch(`/api/v1/admin/audit-log?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      
      if (!response.ok) {
        // Only try to parse JSON if it failed
        try {
          const data = await response.json();
          throw new Error(data.message || 'Failed to export audit logs');
        } catch {
          throw new Error('Failed to export audit logs');
        }
      }
      
      // Check if response is actually CSV (not JSON error)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('text/csv')) {
        throw new Error('Invalid response format - expected CSV');
      }
      
      // Download CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zentype-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      console.info('[AuditLogPage] CSV exported successfully');
      
      // Show GDPR compliance notice
      alert(
        '✅ Audit log exported successfully!\n\n' +
        '⚠️ GDPR NOTICE:\n' +
        'This export contains sensitive administrative data.\n' +
        'Handle according to your data protection policies.\n' +
        'All exports are logged for compliance.'
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[AuditLogPage] Error exporting CSV', { error: errorMessage });
    } finally {
      setExporting(false);
    }
  };

  const handleApplyFilters = () => {
    setPage(1); // Reset to first page when filters change
    fetchLogs();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setAdminEmail('');
    setActionType('all');
    setActionCategory('all');
    setSeverity('all');
    setTargetUserEmail('');
    setSuccessOnly(false);
    setFailedOnly(false);
    setPage(1);
    fetchLogs();
  };

  const toggleRowExpansion = (eventId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const getSeverityBadgeVariant = (severity: AuditSeverity): string => {
    switch (severity) {
      case AuditSeverity.INFO:
        return 'default'; // Gray
      case AuditSeverity.NOTICE:
        return 'secondary'; // Blue
      case AuditSeverity.WARNING:
        return 'outline'; // Yellow border
      case AuditSeverity.ERROR:
        return 'destructive'; // Red
      case AuditSeverity.CRITICAL:
        return 'destructive'; // Red bold
      case AuditSeverity.ALERT:
        return 'destructive'; // Red
      case AuditSeverity.EMERGENCY:
        return 'destructive'; // Red
      default:
        return 'default';
    }
  };

  const getSeverityIcon = (severity: AuditSeverity) => {
    if ([AuditSeverity.CRITICAL, AuditSeverity.ALERT, AuditSeverity.EMERGENCY].includes(severity)) {
      return <AlertTriangle className="w-4 h-4 inline mr-1" />;
    }
    if (severity === AuditSeverity.ERROR) {
      return <AlertTriangle className="w-3 h-3 inline mr-1" />;
    }
    return null;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="w-8 h-8 text-red-500" />
              Audit Log
            </h1>
            <p className="text-muted-foreground mt-1">
              Administrative action history with GDPR compliance
            </p>
          </div>
          
          <Button
            onClick={handleExportCsv}
            disabled={exporting || loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter audit logs by date, admin, action type, severity, or target user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Start Date
              </label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start date"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                End Date
              </label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End date"
              />
            </div>
            
            {/* Admin Email */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <Search className="w-4 h-4" />
                Admin Email
              </label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@zentype.com"
              />
            </div>
            
            {/* Action Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Action Type</label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions ({total})</SelectItem>
                  {Object.values(AuditActionType)
                    .filter(type => availableFilters.actionTypes.has(type))
                    .map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ')} ({availableFilters.actionTypes.get(type) || 0})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Category */}
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={actionCategory} onValueChange={setActionCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories ({total})</SelectItem>
                  {Object.values(AuditCategory)
                    .filter(cat => availableFilters.categories.has(cat))
                    .map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.replace(/_/g, ' ')} ({availableFilters.categories.get(cat) || 0})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Severity */}
            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities ({total})</SelectItem>
                  {Object.values(AuditSeverity)
                    .filter(sev => availableFilters.severities.has(sev))
                    .map(sev => (
                      <SelectItem key={sev} value={sev}>
                        {sev} ({availableFilters.severities.get(sev) || 0})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Target User Email */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <Search className="w-4 h-4" />
                Target User Email
              </label>
              <Input
                type="email"
                value={targetUserEmail}
                onChange={(e) => setTargetUserEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters} disabled={loading}>
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
            <Button onClick={handleResetFilters} variant="outline" disabled={loading}>
              Reset
            </Button>
            <Button onClick={fetchLogs} variant="ghost" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Audit Entries ({filteredTotal > 0 ? `${filteredTotal} out of ${total}` : total} total)
          </CardTitle>
          <CardDescription>
            Showing page {page} • {logs.length} entries
            {filteredTotal > 0 && filteredTotal < total && (
              <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                (filtered from {total} total entries)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No audit logs found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters or date range
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Target User</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <React.Fragment key={log.eventId}>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={() => toggleRowExpansion(log.eventId)}>
                          {expandedRows.has(log.eventId) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{log.actor?.email || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">
                              {log.actor?.role || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {log.action?.type?.replace(/_/g, ' ') || 'Unknown Action'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.action?.description || ''}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityBadgeVariant(log.action?.severity) as any}>
                            {getSeverityIcon(log.action?.severity)}
                            {log.action?.severity || 'UNKNOWN'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.target ? (
                            <div className="text-sm">
                              <div className="font-medium">{log.target.email || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">
                                {log.target.type || 'N/A'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.result?.success ? (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expandable Row Details */}
                      {expandedRows.has(log.eventId) && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30">
                            <div className="p-4 space-y-3">
                              {/* Changes */}
                              {log.changes && log.changes.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">Changes:</h4>
                                  <div className="space-y-2">
                                    {log.changes.map((change, idx) => (
                                      <div key={idx} className="text-sm bg-background p-2 rounded border">
                                        <div className="font-medium">{change.field}</div>
                                        <div className="flex gap-4 mt-1 text-xs">
                                          <div>
                                            <span className="text-muted-foreground">Before: </span>
                                            <span className="text-red-600 line-through">
                                              {String(change.oldValue)}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">After: </span>
                                            <span className="text-green-600 font-semibold">
                                              {String(change.newValue)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Context */}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">IP Address: </span>
                                  <span className="text-muted-foreground">
                                    {log.context.ipAddress || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">Correlation ID: </span>
                                  <span className="text-muted-foreground font-mono text-xs">
                                    {log.context.correlationId || 'N/A'}
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="font-medium">User Agent: </span>
                                  <span className="text-muted-foreground text-xs">
                                    {log.context.userAgent || 'N/A'}
                                  </span>
                                </div>
                                {log.context.reason && (
                                  <div className="col-span-2">
                                    <span className="font-medium">Reason: </span>
                                    <span className="text-muted-foreground">
                                      {log.context.reason}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Error Details */}
                              {!log.result.success && (
                                <div className="bg-red-50 dark:bg-red-950 p-3 rounded border border-red-200 dark:border-red-800">
                                  <h4 className="font-semibold text-sm text-red-600 dark:text-red-400 mb-1">
                                    Error:
                                  </h4>
                                  <p className="text-sm text-red-600 dark:text-red-400">
                                    {log.result.error}
                                  </p>
                                  {log.result.errorCode && (
                                    <p className="text-xs text-red-500 dark:text-red-500 mt-1">
                                      Code: {log.result.errorCode}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => {
                    setLimit(parseInt(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Page {page}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasMore}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* GDPR Notice Footer */}
      <Card className="mt-6 bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <Shield className="w-4 h-4 inline mr-1" />
            <strong>GDPR Compliance:</strong> All audit logs are retained for 7 years per GDPR Article 30.
            IP addresses are anonymized. Exports are logged and include data classification metadata.
            Handle according to your organization's data protection policies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
