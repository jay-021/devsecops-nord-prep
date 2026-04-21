/**
 * API Route: /api/v1/admin/users/[uid]/delete
 * Purpose: Permanently delete user account and all associated data
 * Authorization: Super Admin with canDeleteUsers permission
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin-middleware'
import { deleteUserAccount, getUserWithClaims, db } from '@/lib/firebase-admin'
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
 * DELETE /api/v1/admin/users/[uid]/delete
 * Permanently delete user account and all associated data
 * Requires: Super Admin with canDeleteUsers permission
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }  // ✅ Next.js 15: params is Promise-based
) {
  try {
    // Await params (Next.js 15 requirement)
    const { uid } = await params

    // Verify admin authorization with canDeleteUsers permission
    const adminVerification = await requirePermission(request, 'canDeleteUsers')
    if (!adminVerification.authorized) {
      console.error('[AdminUserDeleteAPI] Unauthorized access attempt', {
        adminUserId: adminVerification.userId,
        targetUid: uid
      })
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Admin with canDeleteUsers permission required' },
        { status: 403 }
      )
    }

    console.info('[AdminUserDeleteAPI] Initiating user deletion', {
      adminUserId: adminVerification.userId,
      targetUid: uid
    })

    // Get current user data for audit log before deletion
    const authUser = await getUserWithClaims(uid)
    if (!authUser) {
      console.warn('[AdminUserDeleteAPI] User not found', { uid })
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent self-deletion
    if (uid === adminVerification.userId) {
      return NextResponse.json(
        { success: false, message: 'Admins cannot delete themselves' },
        { status: 400 }
      )
    }

    // Prevent deleting other admins
    if (authUser.customClaims?.admin || authUser.customClaims?.superAdmin) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete admin users. Remove admin role first.' },
        { status: 400 }
      )
    }

    // Get profile data for audit log
    const profileRef = db.collection('profiles').doc(uid)
    const profileDoc = await profileRef.get()
    const profileData = profileDoc.exists ? profileDoc.data() : undefined

    // Delete user account (includes Auth + Firestore profile)
    await deleteUserAccount(uid)
    console.info('[AdminUserDeleteAPI] User account deleted from Auth and profiles', { uid })

    // Delete associated data from other collections
    const batch = db.batch()

    // Delete test results
    const testResults = await db.collection('testResults').where('userId', '==', uid).get()
    testResults.docs.forEach(doc => batch.delete(doc.ref))
    console.info('[AdminUserDeleteAPI] Queued test results for deletion', {
      uid,
      count: testResults.size
    })

    // Delete subscriptions
    const subscriptions = await db.collection('subscriptions').where('userId', '==', uid).get()
    subscriptions.docs.forEach(doc => batch.delete(doc.ref))
    console.info('[AdminUserDeleteAPI] Queued subscriptions for deletion', {
      uid,
      count: subscriptions.size
    })

    // Commit batch deletion
    await batch.commit()
    console.info('[AdminUserDeleteAPI] Batch deletion committed', { uid })

    // Log to audit trail with centralized logger
    await logAdminAction({
      adminUserId: adminVerification.userId || 'unknown',
      adminEmail: adminVerification.email || 'unknown',
      adminRole: adminVerification.claims?.superAdmin ? 'superAdmin' : 'admin',
      actionType: AuditActionType.USER_ACCOUNT_DELETED,
      actionCategory: AuditCategory.USER_MANAGEMENT,
      actionSeverity: AuditSeverity.CRITICAL,
      actionDescription: `Permanently deleted user account and ${testResults.size} test results, ${subscriptions.size} subscriptions`,
      targetUserId: uid,
      targetUserEmail: authUser.email || undefined,
      changes: [
        {
          field: 'account',
          oldValue: {
            email: authUser.email,
            displayName: authUser.displayName || null,
            username: profileData?.username || null,
            createdAt: authUser.metadata?.creationTime || null,
          },
          newValue: null
        }
      ],
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
      apiEndpoint: request.url,
      success: true,
    })

    console.info('[AdminUserDeleteAPI] User deletion completed successfully', {
      adminUserId: adminVerification.userId,
      targetUid: uid,
      testResultsDeleted: testResults.size,
      subscriptionsDeleted: subscriptions.size
    })

    return NextResponse.json({
      success: true,
      message: 'User account and all associated data deleted successfully',
      deletedData: {
        userId: uid,
        testResults: testResults.size,
        subscriptions: subscriptions.size
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const { uid } = await params  // Await params in catch block too
    console.error('[AdminUserDeleteAPI] Error deleting user', {
      error: errorMessage,
      uid
    })

    // Log failed attempt
    try {
      const { uid: targetUid } = await params  // Await params for audit logging
      const adminVerification = await requirePermission(request, 'canDeleteUsers')
      if (adminVerification.authorized) {
        await logAdminAction({
          adminUserId: adminVerification.userId || 'unknown',
          adminEmail: adminVerification.email || 'unknown',
          adminRole: adminVerification.claims?.superAdmin ? 'superAdmin' : 'admin',
          actionType: AuditActionType.USER_ACCOUNT_DELETED,
          actionCategory: AuditCategory.USER_MANAGEMENT,
          actionSeverity: AuditSeverity.ERROR,
          actionDescription: 'Failed to delete user account',
          targetUserId: targetUid,
          ipAddress: getIpAddress(request),
          userAgent: getUserAgent(request),
          apiEndpoint: request.url,
          success: false,
          error: errorMessage,
        })
      }
    } catch (auditError) {
      console.error('[AdminUserDeleteAPI] Failed to log audit entry', { error: auditError })
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete user account',
        error: errorMessage
      },
      { status: 500 }
    )
  }
}
