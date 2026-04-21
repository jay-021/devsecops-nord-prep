/**
 * API Route: /api/v1/admin/users/[uid]/promote
 * Purpose: Promote user to admin role with custom claims
 * Authorization: Super Admin only
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-middleware'
import {
  setUserCustomClaims,
  revokeUserSessions,
  getUserWithClaims,
  db
} from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import {
  logAdminAction,
  AuditActionType,
  AuditCategory,
  AuditSeverity,
  getIpAddress,
  getUserAgent,
} from '@/lib/admin-audit-logger'

/**
 * POST /api/v1/admin/users/[uid]/promote
 * Promote user to admin or superAdmin role
 * Requires: Super Admin role
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params
    
    // Verify super admin authorization
    const adminVerification = await requireSuperAdmin(request)
    if (!adminVerification.authorized) {
      console.error('[AdminUserPromoteAPI] Unauthorized access attempt', {
        adminUserId: adminVerification.userId,
        targetUid: uid
      })
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Super Admin access required' },
        { status: 403 }
      )
    }
    const body = await request.json()
    const { role, permissions } = body

    // Validate role
    if (!role || !['admin', 'superAdmin'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role. Must be "admin" or "superAdmin"' },
        { status: 400 }
      )
    }

    console.info('[AdminUserPromoteAPI] Promoting user', {
      adminUserId: adminVerification.userId,
      targetUid: uid,
      role,
      permissions
    })

    // Get current user data
    const authUser = await getUserWithClaims(uid)
    if (!authUser) {
      console.warn('[AdminUserPromoteAPI] User not found', { uid })
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent self-demotion for superAdmins
    if (uid === adminVerification.userId && role === 'admin' && adminVerification.claims?.superAdmin) {
      return NextResponse.json(
        { success: false, message: 'Super Admins cannot demote themselves' },
        { status: 400 }
      )
    }

    // Build custom claims
    const customClaims: Record<string, boolean> = {
      admin: true
    }

    if (role === 'superAdmin') {
      customClaims.superAdmin = true
    }

    // Add specific permissions if provided
    if (permissions) {
      if (permissions.canDeleteUsers) customClaims.canDeleteUsers = true
      if (permissions.canManageSubscriptions) customClaims.canManageSubscriptions = true
      if (permissions.canViewAuditLogs) customClaims.canViewAuditLogs = true
      if (permissions.canManageSettings) customClaims.canManageSettings = true
    }

    // Set custom claims
    await setUserCustomClaims(uid, customClaims)
    console.info('[AdminUserPromoteAPI] Custom claims set', { uid, customClaims })

    // Revoke existing sessions to force re-authentication with new claims
    await revokeUserSessions(uid)
    console.info('[AdminUserPromoteAPI] User sessions revoked', { uid })

    // Log to audit trail with centralized logger
    await logAdminAction({
      adminUserId: adminVerification.userId || 'unknown',
      adminEmail: adminVerification.email || 'unknown',
      adminRole: 'superAdmin',
      actionType: AuditActionType.ROLE_GRANTED,
      actionCategory: AuditCategory.PERMISSIONS,
      actionSeverity: AuditSeverity.CRITICAL,
      actionDescription: `Promoted user to ${role} role`,
      targetUserId: uid,
      targetUserEmail: authUser.email || undefined,
      changes: [
        {
          field: 'role',
          oldValue: authUser.customClaims?.admin ? (authUser.customClaims?.superAdmin ? 'superAdmin' : 'admin') : 'user',
          newValue: role
        },
        {
          field: 'customClaims',
          oldValue: authUser.customClaims || {},
          newValue: customClaims
        }
      ],
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
      apiEndpoint: request.url,
      success: true,
    })

    console.info('[AdminUserPromoteAPI] User promoted successfully', {
      adminUserId: adminVerification.userId,
      targetUid: uid,
      role,
      customClaims
    })

    return NextResponse.json({
      success: true,
      message: `User promoted to ${role} successfully. Sessions revoked - user must re-login.`,
      customClaims
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const { uid } = await params
    console.error('[AdminUserPromoteAPI] Error promoting user', {
      error: errorMessage,
      uid
    })

    // Log failed attempt
    try {
      const adminVerification = await requireSuperAdmin(request)
      if (adminVerification.authorized) {
        await logAdminAction({
          adminUserId: adminVerification.userId || 'unknown',
          adminEmail: adminVerification.email || 'unknown',
          adminRole: 'superAdmin',
          actionType: AuditActionType.ROLE_GRANTED,
          actionCategory: AuditCategory.PERMISSIONS,
          actionSeverity: AuditSeverity.ERROR,
          actionDescription: 'Failed to promote user',
          targetUserId: uid,
          ipAddress: getIpAddress(request),
          userAgent: getUserAgent(request),
          apiEndpoint: request.url,
          success: false,
          error: errorMessage,
        })
      }
    } catch (auditError) {
      console.error('[AdminUserPromoteAPI] Failed to log audit entry', { error: auditError })
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to promote user',
        error: errorMessage
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/admin/users/[uid]/promote
 * Remove admin role - demote user to regular user status
 * Requires: Super Admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params
    
    // Verify super admin authorization
    const adminVerification = await requireSuperAdmin(request)
    if (!adminVerification.authorized) {
      console.error('[AdminUserDemoteAPI] Unauthorized access attempt', {
        adminUserId: adminVerification.userId,
        targetUid: uid
      })
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Super Admin access required' },
        { status: 403 }
      )
    }

    console.info('[AdminUserDemoteAPI] Demoting user to regular status', {
      adminUserId: adminVerification.userId,
      targetUid: uid
    })

    // Get current user data
    const authUser = await getUserWithClaims(uid)
    if (!authUser) {
      console.warn('[AdminUserDemoteAPI] User not found', { uid })
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is actually an admin
    if (!authUser.customClaims?.admin) {
      console.warn('[AdminUserDemoteAPI] User is not an admin', { uid })
      return NextResponse.json(
        { success: false, message: 'User is not an admin' },
        { status: 400 }
      )
    }

    // SECURITY RULE: Only super admins can change admin/superAdmin roles
    // Regular admins cannot demote other admins
    const targetIsAdmin = authUser.customClaims?.admin === true
    const targetIsSuperAdmin = authUser.customClaims?.superAdmin === true
    const callerIsSuperAdmin = adminVerification.claims?.superAdmin === true

    if (targetIsAdmin && !callerIsSuperAdmin) {
      console.warn('[AdminUserDemoteAPI] Unauthorized: Only super admins can demote admins', {
        adminUserId: adminVerification.userId,
        targetUid: uid,
        targetIsAdmin,
        targetIsSuperAdmin,
        callerIsSuperAdmin
      })
      return NextResponse.json(
        { success: false, message: 'Only super admins can change admin roles' },
        { status: 403 }
      )
    }

    // SECURITY RULE: Super admin demotion requires either:
    // 1. Another super admin performing the action
    // 2. Self-demotion (user demoting themselves)
    if (targetIsSuperAdmin) {
      const isSelfDemotion = uid === adminVerification.userId
      
      if (!callerIsSuperAdmin && !isSelfDemotion) {
        console.warn('[AdminUserDemoteAPI] Unauthorized: Super admin demotion requires super admin', {
          adminUserId: adminVerification.userId,
          targetUid: uid,
          isSelfDemotion
        })
        return NextResponse.json(
          { success: false, message: 'Only super admins can demote other super admins' },
          { status: 403 }
        )
      }

      // Allow self-demotion but prevent being the last super admin
      if (isSelfDemotion) {
        // TODO: Add check for "last super admin" protection in future
        console.warn('[AdminUserDemoteAPI] Self-demotion of super admin', { uid })
      }
    }

    // Prevent regular self-demotion (non-super-admin demoting themselves)
    // Super admin self-demotion is allowed above
    if (uid === adminVerification.userId && !targetIsSuperAdmin) {
      console.warn('[AdminUserDemoteAPI] Attempted self-demotion', { uid })
      return NextResponse.json(
        { success: false, message: 'Admins cannot demote themselves' },
        { status: 400 }
      )
    }

    // Remove ALL admin custom claims (use removeUnspecified flag)
    await setUserCustomClaims(uid, {}, true)
    console.info('[AdminUserDemoteAPI] Custom claims removed', { uid })

    // Revoke existing sessions to force re-authentication
    await revokeUserSessions(uid)
    console.info('[AdminUserDemoteAPI] User sessions revoked', { uid })

    // Log to audit trail with centralized logger
    await logAdminAction({
      adminUserId: adminVerification.userId || 'unknown',
      adminEmail: adminVerification.email || 'unknown',
      adminRole: 'superAdmin',
      actionType: AuditActionType.ROLE_REVOKED,
      actionCategory: AuditCategory.PERMISSIONS,
      actionSeverity: AuditSeverity.CRITICAL,
      actionDescription: 'Revoked admin role - demoted to regular user',
      targetUserId: uid,
      targetUserEmail: authUser.email || undefined,
      changes: [
        {
          field: 'role',
          oldValue: authUser.customClaims?.superAdmin ? 'superAdmin' : 'admin',
          newValue: 'user'
        },
        {
          field: 'customClaims',
          oldValue: authUser.customClaims || {},
          newValue: {}
        }
      ],
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
      apiEndpoint: request.url,
      success: true,
    })

    console.info('[AdminUserDemoteAPI] User demoted successfully', {
      adminUserId: adminVerification.userId,
      targetUid: uid
    })

    return NextResponse.json({
      success: true,
      message: `Admin role removed successfully. User is now a regular user. Sessions revoked - user must re-login.`
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const { uid } = await params
    console.error('[AdminUserDemoteAPI] Error demoting user', {
      error: errorMessage,
      uid
    })

    // Log failed attempt
    try {
      const adminVerification = await requireSuperAdmin(request)
      if (adminVerification.authorized) {
        await logAdminAction({
          adminUserId: adminVerification.userId || 'unknown',
          adminEmail: adminVerification.email || 'unknown',
          adminRole: 'superAdmin',
          actionType: AuditActionType.ROLE_REVOKED,
          actionCategory: AuditCategory.PERMISSIONS,
          actionSeverity: AuditSeverity.ERROR,
          actionDescription: 'Failed to demote user',
          targetUserId: uid,
          ipAddress: getIpAddress(request),
          userAgent: getUserAgent(request),
          apiEndpoint: request.url,
          success: false,
          error: errorMessage,
        })
      }
    } catch (auditError) {
      console.error('[AdminUserDemoteAPI] Failed to log audit entry', { error: auditError })
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to demote user',
        error: errorMessage
      },
      { status: 500 }
    )
  }
}
