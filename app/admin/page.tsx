"use client"

import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Shield, Users, CreditCard, Settings, LogOut, BarChart, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/firebase/client"
import { signOut } from "firebase/auth"
import { useAdminAuth } from "@/hooks/useAdminAuth"

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, adminData, isLoading, error } = useAdminAuth()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/admin/login')
    } catch (error) {
      console.error('[Admin Dashboard] Logout error:', error)
    }
  }

  if (isLoading || !adminData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Admin Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-red-500" />
              <h1 className="text-4xl font-bold text-foreground">Admin Dashboard</h1>
            </div>
            <p className="text-muted-foreground">
              Role: <span className="font-semibold text-foreground">
                {adminData.role === 'superAdmin' ? 'Super Admin' : 'Admin'}
              </span>
            </p>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Permissions Badge */}
        <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <h2 className="text-sm font-semibold text-foreground mb-2">Your Permissions:</h2>
          <div className="flex flex-wrap gap-2">
            {adminData.permissions?.admin && (
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                Admin Access
              </span>
            )}
            {adminData.permissions?.superAdmin && (
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                Super Admin
              </span>
            )}
            {adminData.permissions?.canDeleteUsers && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                Delete Users
              </span>
            )}
            {adminData.permissions?.canManageSubscriptions && (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                Manage Subscriptions
              </span>
            )}
          </div>
        </div>

        {/* Admin Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Analytics Card */}
          <div 
            data-testid="analytics-card"
            className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-6 cursor-pointer hover:border-blue-500/40 transition-all"
            onClick={() => router.push('/admin/analytics')}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <BarChart className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Analytics</h3>
                <p className="text-sm text-muted-foreground">Business metrics & insights</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              View comprehensive analytics including user metrics, test statistics, engagement data, and business performance.
            </p>
            <Button 
              className="w-full"
              variant="default"
            >
              View Analytics →
            </Button>
          </div>

          {/* User Management Card */}
          <div 
            data-testid="users-card"
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6 cursor-pointer hover:border-purple-500/40 transition-all"
            onClick={() => router.push('/admin/users')}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">User Management</h3>
                <p className="text-sm text-muted-foreground">Manage accounts & roles</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Search, filter, and manage user accounts. Edit profiles, promote to admin, manage permissions, and suspend accounts.
            </p>
            <Button 
              className="w-full"
              variant="default"
            >
              Manage Users →
            </Button>
          </div>

          {/* Subscriptions Card */}
          <div 
            data-testid="subscriptions-card"
            className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-6 cursor-pointer hover:border-green-500/40 transition-all"
            onClick={() => router.push('/admin/subscriptions')}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Subscriptions</h3>
                <p className="text-sm text-muted-foreground">Manage tiers & limits</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              View all subscriptions, upgrade/downgrade users, modify AI test limits, and monitor usage across tiers.
            </p>
            <Button 
              className="w-full"
              variant="default"
            >
              Manage Subscriptions →
            </Button>
          </div>

          {/* Audit Log Card */}
          <div 
            data-testid="audit-card"
            className="bg-gradient-to-br from-amber-500/10 to-red-500/10 border border-amber-500/20 rounded-lg p-6 cursor-pointer hover:border-amber-500/40 transition-all"
            onClick={() => router.push('/admin/audit-log')}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Audit Log</h3>
                <p className="text-sm text-muted-foreground">GDPR-compliant history</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Complete audit trail of admin actions with timestamps, IP addresses, and detailed change logs for compliance.
            </p>
            <Button 
              className="w-full"
              variant="default"
            >
              View Audit Log →
            </Button>
          </div>
        </div>

        {/* Phase 1 Complete Badge */}
        <div className="mt-8 p-6 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-500 text-lg">✓</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Phase 1 Foundation Complete
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Admin authentication system is fully operational. You can now securely access the admin panel.
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>✓ Firebase custom claims RBAC implemented</li>
                <li>✓ Admin middleware with permission checks</li>
                <li>✓ Admin audit logging configured</li>
                <li>✓ Secure admin authentication flow</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
