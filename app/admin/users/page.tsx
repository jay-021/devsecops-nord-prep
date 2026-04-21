"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Shield, Search, Filter, ChevronLeft, ChevronRight, Users, Crown, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAdminAuth } from "@/hooks/useAdminAuth"

interface UserData {
  uid: string
  email: string
  displayName: string
  photoURL: string | null
  emailVerified: boolean
  disabled: boolean
  createdAt: string
  lastSignInAt: string | null
  customClaims: any
  profile: {
    username: string
    bio: string
    stats: {
      rank: string
      testsCompleted: number
      avgWpm: number
      avgAcc: number
    }
  } | null
  subscription: {
    tier: 'free' | 'premium'
    status: string
    aiTestsUsedToday: number
    aiTestDailyLimit: number
  } | null
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user: adminUser, isLoading: authLoading } = useAdminAuth()
  
  const [users, setUsers] = useState<UserData[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [tierFilter, setTierFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState("")

  const fetchUsers = async (page: number, search: string, tier: string) => {
    if (!adminUser) return // Wait for auth to be ready
    
    try {
      setIsLoading(true)
      setError("")

      const idToken = await adminUser.getIdToken()
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      })
      
      if (search) params.append('search', search)
      if (tier) params.append('tier', tier)

      const response = await fetch(`/api/v1/admin/users?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        if (response.status === 403) {
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
      setIsLoading(false)
    } catch (error) {
      console.error('[Admin Users] Error fetching users:', error)
      setError('Failed to load users. Please try again.')
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && adminUser) {
      fetchUsers(currentPage, searchQuery, tierFilter)
    }
  }, [currentPage, searchQuery, tierFilter, authLoading, adminUser])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) // Reset to first page on search
  }

  const handleTierFilter = (value: string) => {
    setTierFilter(value)
    setCurrentPage(1) // Reset to first page on filter
  }

  const handleUserClick = (uid: string) => {
    router.push(`/admin/users/${uid}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (authLoading || (isLoading && users.length === 0)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">
              {authLoading ? 'Verifying admin access...' : 'Loading users...'}
            </p>
          </div>
        </main>
      </div>
    )
  }
  
  if (!adminUser) return null // Redirecting...

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-500" />
            <div>
              <h1 className="text-4xl font-bold text-foreground">User Management</h1>
              <p className="text-muted-foreground">
                {pagination && `${pagination.total} total users`}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => router.push('/admin')}
            variant="outline"
          >
            ← Back to Dashboard
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by email, username, or UID..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={tierFilter}
              onChange={(e) => handleTierFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="">All Tiers</option>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-4 mb-6">
          {users.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.uid}
                onClick={() => handleUserClick(user.uid)}
                className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full" />
                      ) : (
                        <span className="text-lg font-semibold text-primary">
                          {user.displayName[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-foreground truncate">
                          {user.displayName}
                        </h3>
                        {user.customClaims?.superAdmin && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded">
                            Super Admin
                          </span>
                        )}
                        {user.customClaims?.admin && !user.customClaims?.superAdmin && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded">
                            Admin
                          </span>
                        )}
                        {user.subscription?.tier === 'premium' && (
                          <Crown className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
                      
                      {/* Stats */}
                      {user.profile && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Rank: {user.profile.stats.rank}</span>
                          <span>Tests: {user.profile.stats.testsCompleted}</span>
                          <span>WPM: {user.profile.stats.avgWpm}</span>
                          <span>Accuracy: {user.profile.stats.avgAcc}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side Info */}
                  <div className="flex flex-col items-end gap-2 ml-4">
                    {/* Subscription Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.subscription?.tier === 'premium'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.subscription?.tier === 'premium' ? 'Premium' : 'Free'}
                    </span>
                    
                    {/* AI Tests Usage */}
                    {user.subscription && (
                      <span className="text-xs text-muted-foreground">
                        AI: {user.subscription.aiTestsUsedToday}/{user.subscription.aiTestDailyLimit === -1 ? '∞' : user.subscription.aiTestDailyLimit}
                      </span>
                    )}
                    
                    {/* Join Date */}
                    <span className="text-xs text-muted-foreground">
                      Joined {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={!pagination.hasMore || isLoading}
                variant="outline"
                size="sm"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
