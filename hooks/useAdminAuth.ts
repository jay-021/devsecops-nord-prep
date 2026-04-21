/**
 * Admin Authentication Hook
 * 
 * Provides secure admin authentication with session persistence across page refreshes.
 * Uses Firebase onAuthStateChanged listener to wait for auth state restoration.
 * 
 * Problem Solved:
 * - Admin pages were checking auth.currentUser synchronously on mount
 * - This returned null before Firebase restored the session (~100-500ms delay)
 * - Result: Immediate redirect to login on every page refresh
 * 
 * Solution:
 * - Use onAuthStateChanged listener (async pattern)
 * - Wait for auth state to be fully restored before checking
 * - Verify admin custom claims via API
 * - Provide loading state to prevent premature redirects
 * 
 * Usage:
 * ```tsx
 * import { useAdminAuth } from '@/hooks/useAdminAuth';
 * 
 * export default function AdminDashboard() {
 *   const { user, adminData, isLoading, error } = useAdminAuth();
 *   
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!user || !adminData) return null; // Redirecting...
 *   
 *   // Render admin content
 * }
 * ```
 * 
 * @version 1.0
 * @created November 17, 2025
 * @related ERROR-ADMIN-007 (Admin session lost on page refresh)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged, User } from 'firebase/auth';

interface AdminData {
  authorized: boolean;
  role: 'admin' | 'superAdmin';
  permissions: {
    admin: boolean;
    superAdmin: boolean;
    canDeleteUsers: boolean;
    canManageSubscriptions: boolean;
  };
}

interface UseAdminAuthReturn {
  user: User | null;
  adminData: AdminData | null;
  isLoading: boolean;
  error: string | null;
  revalidate: () => Promise<void>;
}

/**
 * Admin authentication hook with session persistence
 * 
 * Features:
 * - Waits for Firebase auth state restoration on page load
 * - Verifies admin custom claims via API
 * - Automatically redirects non-admin users to login
 * - Provides loading state to prevent UI flicker
 * - Logs authentication flow for debugging
 * 
 * @returns {UseAdminAuthReturn} Admin auth state and methods
 */
export function useAdminAuth(): UseAdminAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();

  /**
   * Verify admin access via API
   * Fetches custom claims and permissions from backend
   */
  const verifyAdminAccess = async (currentUser: User): Promise<boolean> => {
    try {
      console.log('[useAdminAuth] Verifying admin access for:', currentUser.email);
      
      const idToken = await currentUser.getIdToken();
      
      const response = await fetch('/api/v1/admin/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[useAdminAuth] Admin verification failed:', response.status);
        return false;
      }

      const data = await response.json();
      
      if (!data.authorized) {
        console.warn('[useAdminAuth] User is not an admin:', currentUser.email);
        return false;
      }

      console.log('[useAdminAuth] ✅ Admin access verified');
      setAdminData({
        authorized: data.authorized,
        role: data.role || 'admin',
        permissions: data.permissions || {
          admin: false,
          superAdmin: false,
          canDeleteUsers: false,
          canManageSubscriptions: false,
        },
      });

      return true;
    } catch (error) {
      console.error('[useAdminAuth] Error verifying admin access:', error);
      return false;
    }
  };

  /**
   * Revalidate admin access (for use after permission changes)
   */
  const revalidate = async (): Promise<void> => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    const isAdmin = await verifyAdminAccess(user);
    
    if (!isAdmin) {
      console.error('[useAdminAuth] Revalidation failed - redirecting to login');
      setError('Admin access revoked');
      router.push('/admin/login');
    }
    
    setIsLoading(false);
  };

  /**
   * Main auth state listener
   * Waits for Firebase to restore session before checking admin access
   */
  useEffect(() => {
    console.log('[useAdminAuth] Setting up auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('[useAdminAuth] Auth state changed:', currentUser?.email || 'null');
      
      setUser(currentUser);
      setAuthReady(true);
      
      if (!currentUser) {
        // No user authenticated - redirect to login
        console.log('[useAdminAuth] No user authenticated, redirecting to login');
        setAdminData(null);
        setIsLoading(false);
        router.push('/admin/login');
        return;
      }

      // User is authenticated - verify admin access
      const isAdmin = await verifyAdminAccess(currentUser);
      
      if (!isAdmin) {
        // User is not an admin - redirect to login
        console.error('[useAdminAuth] User is not an admin, redirecting to login');
        setError('Unauthorized: Admin access required');
        setAdminData(null);
        setIsLoading(false);
        router.push('/admin/login');
        return;
      }

      // Success - admin access verified
      console.log('[useAdminAuth] ✅ Admin authenticated and verified');
      setError(null);
      setIsLoading(false);
    });

    // Cleanup listener on unmount
    return () => {
      console.log('[useAdminAuth] Cleaning up auth state listener');
      unsubscribe();
    };
  }, [router]);

  return {
    user,
    adminData,
    isLoading,
    error,
    revalidate,
  };
}
