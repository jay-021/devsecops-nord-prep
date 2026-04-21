// lib/admin-middleware.ts
// Admin authorization middleware for Next.js API routes
// Created: November 17, 2025

import { NextRequest } from 'next/server';
import { verifyAdminToken } from './firebase-admin';
import type { AdminClaims } from './types/database';

/**
 * Extract ID token from Authorization header
 */
function extractToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return undefined;
  }
  return authHeader.replace('Bearer ', '');
}

/**
 * Admin middleware result
 */
export interface AdminAuthResult {
  authorized: boolean;
  userId?: string;
  email?: string;
  claims?: AdminClaims;
  error?: string;
}

/**
 * Require basic admin access
 * Use this for read-only admin routes (viewing dashboards, user lists)
 * 
 * @param request - Next.js request object
 * @returns Authorization result with user info or error
 * 
 * @example
 * export async function GET(request: NextRequest) {
 *   const auth = await requireAdmin(request);
 *   if (!auth.authorized) {
 *     return Response.json({ error: auth.error }, { status: 403 });
 *   }
 *   
 *   // Admin is authorized - proceed with operation
 *   const users = await listUsers();
 *   return Response.json({ users });
 * }
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AdminAuthResult> {
  const token = extractToken(request);
  
  if (!token) {
    console.warn('[Admin Middleware] No authorization token provided');
    return {
      authorized: false,
      error: 'No authorization token provided',
    };
  }

  const decodedToken = await verifyAdminToken(token);
  
  if (!decodedToken) {
    console.warn('[Admin Middleware] Invalid or expired token');
    return {
      authorized: false,
      error: 'Invalid or expired token',
    };
  }

  // Check if user has admin claim
  const customClaims = decodedToken as unknown as AdminClaims;
  
  if (!customClaims.admin) {
    console.warn('[Admin Middleware] User is not an admin', {
      uid: decodedToken.uid,
      email: decodedToken.email,
    });
    return {
      authorized: false,
      error: 'Insufficient permissions - admin role required',
    };
  }

  console.log('[Admin Middleware] Admin access granted', {
    uid: decodedToken.uid,
    email: decodedToken.email,
    role: customClaims.superAdmin ? 'superAdmin' : 'admin',
  });

  return {
    authorized: true,
    userId: decodedToken.uid,
    email: decodedToken.email || undefined,
    claims: customClaims,
  };
}

/**
 * Require super admin access
 * Use this for write operations (promoting users, modifying subscriptions)
 * 
 * @param request - Next.js request object
 * @returns Authorization result with user info or error
 * 
 * @example
 * export async function POST(request: NextRequest) {
 *   const auth = await requireSuperAdmin(request);
 *   if (!auth.authorized) {
 *     return Response.json({ error: auth.error }, { status: 403 });
 *   }
 *   
 *   // Super admin is authorized - proceed with dangerous operation
 *   const { userId, role } = await request.json();
 *   await setUserCustomClaims(userId, { admin: true, superAdmin: role === 'superAdmin' });
 *   return Response.json({ success: true });
 * }
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<AdminAuthResult> {
  const token = extractToken(request);
  
  if (!token) {
    console.warn('[Admin Middleware] No authorization token provided');
    return {
      authorized: false,
      error: 'No authorization token provided',
    };
  }

  const decodedToken = await verifyAdminToken(token);
  
  if (!decodedToken) {
    console.warn('[Admin Middleware] Invalid or expired token');
    return {
      authorized: false,
      error: 'Invalid or expired token',
    };
  }

  // Check if user has superAdmin claim
  const customClaims = decodedToken as unknown as AdminClaims;
  
  if (!customClaims.superAdmin) {
    console.warn('[Admin Middleware] User is not a super admin', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAdmin: customClaims.admin || false,
    });
    return {
      authorized: false,
      error: 'Insufficient permissions - super admin role required',
    };
  }

  console.log('[Admin Middleware] Super admin access granted', {
    uid: decodedToken.uid,
    email: decodedToken.email,
  });

  return {
    authorized: true,
    userId: decodedToken.uid,
    email: decodedToken.email || undefined,
    claims: customClaims,
  };
}

/**
 * Require specific permission
 * Use this for granular permission checks (canDeleteUsers, canManageSubscriptions)
 * 
 * @param request - Next.js request object
 * @param permission - Required permission key
 * @returns Authorization result with user info or error
 * 
 * @example
 * export async function DELETE(request: NextRequest) {
 *   const auth = await requirePermission(request, 'canDeleteUsers');
 *   if (!auth.authorized) {
 *     return Response.json({ error: auth.error }, { status: 403 });
 *   }
 *   
 *   // User has canDeleteUsers permission - proceed with deletion
 *   const { userId } = await request.json();
 *   await deleteUserAccount(userId);
 *   return Response.json({ success: true });
 * }
 */
export async function requirePermission(
  request: NextRequest,
  permission: keyof AdminClaims
): Promise<AdminAuthResult> {
  const token = extractToken(request);
  
  if (!token) {
    console.warn('[Admin Middleware] No authorization token provided');
    return {
      authorized: false,
      error: 'No authorization token provided',
    };
  }

  const decodedToken = await verifyAdminToken(token);
  
  if (!decodedToken) {
    console.warn('[Admin Middleware] Invalid or expired token');
    return {
      authorized: false,
      error: 'Invalid or expired token',
    };
  }

  const customClaims = decodedToken as unknown as AdminClaims;
  
  // Super admins have all permissions
  if (customClaims.superAdmin) {
    console.log('[Admin Middleware] Super admin has all permissions', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      requestedPermission: permission,
    });
    return {
      authorized: true,
      userId: decodedToken.uid,
      email: decodedToken.email || undefined,
      claims: customClaims,
    };
  }

  // Check specific permission
  if (!customClaims[permission]) {
    console.warn('[Admin Middleware] Permission denied', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      requestedPermission: permission,
      userClaims: customClaims,
    });
    return {
      authorized: false,
      error: `Insufficient permissions - ${permission} required`,
    };
  }

  console.log('[Admin Middleware] Permission granted', {
    uid: decodedToken.uid,
    email: decodedToken.email,
    permission,
  });

  return {
    authorized: true,
    userId: decodedToken.uid,
    email: decodedToken.email || undefined,
    claims: customClaims,
  };
}

/**
 * Verify user has any admin role (basic admin or super admin)
 * Use this for checking if user should see admin UI elements
 * 
 * @param token - Firebase ID token
 * @returns True if user has any admin role
 */
export async function isAdmin(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  
  const decodedToken = await verifyAdminToken(token);
  if (!decodedToken) return false;
  
  const customClaims = decodedToken as unknown as AdminClaims;
  return customClaims.admin === true || customClaims.superAdmin === true;
}

/**
 * Get admin claims from token without throwing errors
 * Use this for conditional UI rendering
 * 
 * @param token - Firebase ID token
 * @returns Admin claims or null
 */
export async function getAdminClaims(
  token: string | undefined
): Promise<AdminClaims | null> {
  if (!token) return null;
  
  const decodedToken = await verifyAdminToken(token);
  if (!decodedToken) return null;
  
  const customClaims = decodedToken as unknown as AdminClaims;
  
  return {
    admin: customClaims.admin || false,
    superAdmin: customClaims.superAdmin || false,
    canDeleteUsers: customClaims.canDeleteUsers || false,
    canManageSubscriptions: customClaims.canManageSubscriptions || false,
  };
}
