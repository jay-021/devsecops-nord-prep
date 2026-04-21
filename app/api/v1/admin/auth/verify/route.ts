// app/api/v1/admin/auth/verify/route.ts
// Admin authentication verification endpoint
// Verifies that authenticated user has admin custom claims
// Created: November 17, 2025

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { db } from '@/lib/firebase-admin';
import {
  logAdminAction,
  AuditActionType,
  AuditCategory,
  AuditSeverity,
  getIpAddress,
  getUserAgent,
} from '@/lib/admin-audit-logger';

/**
 * POST /api/v1/admin/auth/verify
 * Verify admin authentication and custom claims
 * 
 * Request:
 * - Authorization: Bearer <idToken>
 * 
 * Response:
 * - 200: { authorized: true, userId, email, role, permissions }
 * - 403: { error: "Unauthorized" }
 * - 500: { error: "Internal server error" }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Admin Auth] Verification request received');
    
    // Verify admin access using middleware
    const auth = await requireAdmin(request);
    
    if (!auth.authorized) {
      console.warn('[Admin Auth] Verification failed', { error: auth.error });
      return NextResponse.json(
        { 
          error: auth.error || 'Unauthorized',
          authorized: false 
        },
        { status: 403 }
      );
    }

    // Determine admin role
    const role = auth.claims?.superAdmin ? 'superAdmin' : 'admin';
    
    // Extract permissions
    const permissions = {
      admin: auth.claims?.admin || false,
      superAdmin: auth.claims?.superAdmin || false,
      canDeleteUsers: auth.claims?.canDeleteUsers || false,
      canManageSubscriptions: auth.claims?.canManageSubscriptions || false,
    };

    // Log successful admin login to audit log with centralized logger
    try {
      await logAdminAction({
        adminUserId: auth.userId || 'unknown',
        adminEmail: auth.email || 'unknown',
        adminRole: role,
        actionType: AuditActionType.ADMIN_LOGIN,
        actionCategory: AuditCategory.AUTHENTICATION,
        actionSeverity: AuditSeverity.INFO,
        actionDescription: 'Admin logged into admin panel',
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
        apiEndpoint: request.url,
        success: true,
      });
      console.log('[Admin Auth] Login audit logged', { userId: auth.userId });
    } catch (auditError) {
      console.error('[Admin Auth] Failed to log audit entry:', auditError);
      // Don't fail the request if audit logging fails
    }

    console.log('[Admin Auth] Verification successful', {
      userId: auth.userId,
      email: auth.email,
      role,
    });

    return NextResponse.json({
      authorized: true,
      userId: auth.userId,
      email: auth.email,
      role,
      permissions,
    });
  } catch (error) {
    console.error('[Admin Auth] Verification error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        authorized: false 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/admin/auth/verify
 * Check if current user has admin access (for client-side checks)
 * 
 * Request:
 * - Authorization: Bearer <idToken>
 * 
 * Response:
 * - 200: { authorized: true, role, permissions }
 * - 403: { authorized: false }
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    
    if (!auth.authorized) {
      return NextResponse.json({ authorized: false }, { status: 403 });
    }

    const role = auth.claims?.superAdmin ? 'superAdmin' : 'admin';
    const permissions = {
      admin: auth.claims?.admin || false,
      superAdmin: auth.claims?.superAdmin || false,
      canDeleteUsers: auth.claims?.canDeleteUsers || false,
      canManageSubscriptions: auth.claims?.canManageSubscriptions || false,
    };

    return NextResponse.json({
      authorized: true,
      role,
      permissions,
    });
  } catch (error) {
    console.error('[Admin Auth] GET verification error:', error);
    return NextResponse.json({ authorized: false }, { status: 500 });
  }
}
