"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassCard } from '@/components/ui/glass-card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { 
  Crown, 
  Search, 
  Zap, 
  Filter,
  ArrowLeft,
  Loader2
} from 'lucide-react';

interface Subscription {
  userId: string;
  tier: 'free' | 'premium';
  status: string;
  aiTestsUsedToday: number;
  aiTestsRemaining: number | 'unlimited';
  dailyLimit: number | 'unlimited';
  lastResetDate: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt?: string;
}

interface UserWithSubscription {
  userId: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  lastSignIn: string;
  emailVerified: boolean;
  disabled: boolean;
  subscription: Subscription;
}

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  // State
  const [subscriptions, setSubscriptions] = useState<UserWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Updating state for tier changes
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  
  // Fetch subscriptions - get fresh token on each call
  useEffect(() => {
    fetchSubscriptions();
  }, [page, tierFilter, searchQuery, user]);
  
  const fetchSubscriptions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get fresh token for this request
      const idToken = await user.getIdToken();
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      
      if (tierFilter !== 'all') {
        params.append('tier', tierFilter);
      }
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      
      const response = await fetch(`/api/v1/admin/subscriptions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }
      
      const data = await response.json();
      
      setSubscriptions(data.subscriptions);
      setTotalUsers(data.pagination.total);
      setHasMore(data.pagination.hasMore);
      
      console.log('[AdminSubscriptions] Subscriptions loaded', {
        count: data.subscriptions.length,
        total: data.pagination.total
      });
      
    } catch (error) {
      console.error('[AdminSubscriptions] Failed to fetch subscriptions', {
        error: error instanceof Error ? error.message : String(error)
      });
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTierChange = async (userId: string, currentTier: string, newTier: 'free' | 'premium') => {
    if (!user) {
      alert('Authentication required');
      return;
    }
    
    if (currentTier === newTier) {
      alert('User is already on this tier');
      return;
    }
    
    // Confirm tier change
    const confirmMessage = `Change subscription tier from ${currentTier.toUpperCase()} to ${newTier.toUpperCase()}?\n\nThis will take effect immediately.`;
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setUpdatingUserId(userId);
    
    try {
      // Get fresh token for this request
      const idToken = await user.getIdToken();
      
      const response = await fetch(`/api/v1/admin/subscriptions/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tier: newTier,
          reason: `Admin changed tier from ${currentTier} to ${newTier}`
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update subscription');
      }
      
      const data = await response.json();
      
      console.log('[AdminSubscriptions] Tier changed successfully', {
        userId,
        fromTier: currentTier,
        toTier: newTier
      });
      
      alert(`✅ Subscription tier changed from ${currentTier.toUpperCase()} to ${newTier.toUpperCase()}`);
      
      // Refresh subscriptions list
      await fetchSubscriptions();
      
    } catch (error) {
      console.error('[AdminSubscriptions] Failed to change tier', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      alert(`Failed to change tier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdatingUserId(null);
    }
  };
  
  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Redirect if not authenticated
  if (!user) {
    router.push('/admin/login');
    return null;
  }
  
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Subscription Management</h1>
              <p className="text-muted-foreground">
                Manage user subscription tiers and AI test limits
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">{totalUsers}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <GlassCard className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by email or user ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1); // Reset to first page on new search
                  }}
                  className="pl-10 bg-accent border-border"
                />
              </div>
            </div>
            
            {/* Tier Filter */}
            <div className="w-full md:w-48">
              <Select value={tierFilter} onValueChange={(value: 'all' | 'free' | 'premium') => {
                setTierFilter(value);
                setPage(1);
              }}>
                <SelectTrigger className="bg-accent border-border">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="free">Free Tier</SelectItem>
                  <SelectItem value="premium">Premium Tier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </GlassCard>
        
        {/* Loading State */}
        {loading && subscriptions.length === 0 && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <GlassCard className="p-6 border-destructive">
            <p className="text-destructive text-center">{error}</p>
          </GlassCard>
        )}
        
        {/* Subscriptions List */}
        {!loading && subscriptions.length === 0 && !error && (
          <GlassCard className="p-12 text-center">
            <p className="text-muted-foreground text-lg">No users found matching your filters</p>
          </GlassCard>
        )}
        
        {subscriptions.length > 0 && (
          <div className="space-y-4">
            {subscriptions.map((user) => (
              <GlassCard 
                key={user.userId} 
                className="p-6 hover:border-primary/50 transition-all"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold text-lg shrink-0">
                      {user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-foreground truncate">
                          {user.displayName || 'No Display Name'}
                        </h3>
                        {user.subscription.tier === 'premium' && (
                          <Crown className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Last sign in: {new Date(user.lastSignIn).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subscription Info & Actions */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                    {/* AI Tests Counter */}
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent border border-border">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <span className="font-semibold text-foreground">
                          {user.subscription.aiTestsRemaining === 'unlimited' 
                            ? '∞' 
                            : user.subscription.aiTestsRemaining}
                        </span>
                        <span className="text-muted-foreground">
                          {user.subscription.aiTestsRemaining === 'unlimited'
                            ? ' AI tests'
                            : ` of ${user.subscription.tier === 'free' ? 5 : 50} today`}
                        </span>
                      </div>
                    </div>
                    
                    {/* Tier Change Dropdown */}
                    <Select 
                      value={user.subscription.tier} 
                      onValueChange={(newTier: 'free' | 'premium') => 
                        handleTierChange(user.userId, user.subscription.tier, newTier)
                      }
                      disabled={updatingUserId === user.userId}
                    >
                      <SelectTrigger className={`w-full md:w-36 ${
                        user.subscription.tier === 'premium' 
                          ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-600/30' 
                          : 'bg-accent border-border'
                      }`}>
                        {updatingUserId === user.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Free Tier
                          </div>
                        </SelectItem>
                        <SelectItem value="premium">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            Premium Tier
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {subscriptions.length > 0 && (
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Page {page}
            </span>
            
            <Button
              variant="outline"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || loading}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
