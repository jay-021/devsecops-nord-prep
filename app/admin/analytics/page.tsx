/**
 * Admin Analytics Dashboard
 * /admin/analytics
 * 
 * Real-time platform metrics and system health monitoring.
 * Auto-refreshes every 30 seconds for live data.
 * 
 * Features:
 * - Metric cards (total users, premium users, AI tests, signups)
 * - System health indicators (Firestore, Firebase Auth)
 * - Auto-refresh with manual refresh button
 * - Loading skeletons for better UX
 * - Responsive design
 * 
 * @version 1.0
 * @created November 17, 2025
 */

'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Users,
  Crown,
  Sparkles,
  UserPlus,
  Activity,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface AnalyticsData {
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
  cached?: boolean;
}

// Memoized metric card to prevent re-renders when data hasn't changed
const MetricCard = memo(({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  iconColor, 
  valueColor 
}: { 
  icon: any; 
  title: string; 
  value: string; 
  subtitle: string; 
  iconColor?: string; 
  valueColor?: string;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor || ''}`} />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-3xl font-bold ${valueColor || ''}`}>
        {value}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {subtitle}
      </p>
    </CardContent>
  </Card>
));

MetricCard.displayName = 'MetricCard';

export default function AnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Memoize expensive percentage calculations to prevent re-computation on every render
  const premiumPercentage = useMemo(() => {
    if (!analytics || analytics.totalUsers === 0) return '0% of users';
    return `${Math.round((analytics.premiumUsers / analytics.totalUsers) * 100)}% of users`;
  }, [analytics?.premiumUsers, analytics?.totalUsers]);

  const freePercentage = useMemo(() => {
    if (!analytics || analytics.totalUsers === 0) return '0% of users';
    return `${Math.round((analytics.freeUsers / analytics.totalUsers) * 100)}% of users`;
  }, [analytics?.freeUsers, analytics?.totalUsers]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      fetchAnalytics(false); // Silent refresh (no loading spinner)
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  const fetchAnalytics = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      
      // Get Firebase ID token for authorization
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/v1/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch analytics');
      }
      
      setAnalytics(data);
      setLastRefresh(new Date());
      
      console.info('[AnalyticsPage] Analytics fetched', {
        cached: data.cached,
        totalUsers: data.totalUsers,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[AnalyticsPage] Error fetching analytics', { error: errorMessage });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleManualRefresh = useCallback(() => {
    fetchAnalytics(true);
  }, []);

  const formatNumber = useCallback((num: number): string => {
    return num.toLocaleString();
  }, []);

  const getHealthIcon = useCallback((status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  }, []);

  const getHealthBadgeVariant = useCallback((status: 'healthy' | 'degraded' | 'down'): string => {
    switch (status) {
      case 'healthy':
        return 'default'; // Green
      case 'degraded':
        return 'outline'; // Yellow
      case 'down':
        return 'destructive'; // Red
    }
  }, []);

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
              <Activity className="w-8 h-8 text-blue-500" />
              Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time platform metrics and system health
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            <Button
              onClick={handleManualRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

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

      {/* Loading State */}
      {loading && !analytics ? (
        <div className="space-y-6">
          {/* Skeleton Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-24 mb-2" />
                  <div className="h-8 bg-muted rounded w-16" />
                </CardHeader>
              </Card>
            ))}
          </div>
          
          {/* Skeleton System Health */}
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-32" />
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        </div>
      ) : analytics ? (
        <>
          {/* Metric Cards Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Users */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(analytics.totalUsers)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Registered accounts
                </p>
              </CardContent>
            </Card>

            {/* Premium Users */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  Premium Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">
                  {formatNumber(analytics.premiumUsers)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {premiumPercentage}
                </p>
              </CardContent>
            </Card>

            {/* AI Tests Today */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  AI Tests Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-500">
                  {formatNumber(analytics.aiTestsToday)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Generated today
                </p>
              </CardContent>
            </Card>

            {/* New Signups (7d) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-green-500" />
                  New Signups (7d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 dark:text-green-500">
                  {formatNumber(analytics.newSignups7d)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 7 days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Metric Cards Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* New Signups (30d) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-500" />
                  New Signups (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">
                  {formatNumber(analytics.newSignups30d)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 30 days
                </p>
              </CardContent>
            </Card>

            {/* Tests Completed Today */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Tests Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-500">
                  {formatNumber(analytics.testsCompletedToday)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed today
                </p>
              </CardContent>
            </Card>

            {/* Average WPM */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-500" />
                  Average WPM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-500">
                  {formatNumber(analytics.avgWpm)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Platform average
                </p>
              </CardContent>
            </Card>

            {/* Free Users */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Free Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(analytics.freeUsers)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {freePercentage}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Health */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Health
              </CardTitle>
              <CardDescription>
                Real-time status of platform services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Firestore Status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getHealthIcon(analytics.systemHealth.firestoreStatus)}
                    <div>
                      <div className="font-semibold">Firestore Database</div>
                      <div className="text-sm text-muted-foreground">
                        Primary data storage
                      </div>
                    </div>
                  </div>
                  <Badge variant={getHealthBadgeVariant(analytics.systemHealth.firestoreStatus) as any}>
                    {analytics.systemHealth.firestoreStatus.toUpperCase()}
                  </Badge>
                </div>

                {/* Firebase Auth Status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getHealthIcon(analytics.systemHealth.authStatus)}
                    <div>
                      <div className="font-semibold">Firebase Authentication</div>
                      <div className="text-sm text-muted-foreground">
                        User authentication service
                      </div>
                    </div>
                  </div>
                  <Badge variant={getHealthBadgeVariant(analytics.systemHealth.authStatus) as any}>
                    {analytics.systemHealth.authStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Last health check: {new Date(analytics.systemHealth.lastUpdated).toLocaleString()}
                </div>
                {analytics.cached && (
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <Zap className="w-3 h-3" />
                    Cached data (refreshes every 5 minutes)
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Auto-Refresh Toggle */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">Auto-Refresh</div>
                    <div className="text-sm text-muted-foreground">
                      {autoRefreshEnabled ? 'Updates every 30 seconds' : 'Paused'}
                    </div>
                  </div>
                </div>
                <Button
                  variant={autoRefreshEnabled ? 'default' : 'outline'}
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                >
                  {autoRefreshEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
