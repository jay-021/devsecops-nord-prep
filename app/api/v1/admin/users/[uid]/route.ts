import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-middleware'
import { getUserWithClaims, updateUserEmail } from '@/lib/firebase-admin'
import { db } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import {
  logAdminAction,
  AuditActionType,
  AuditCategory,
  AuditSeverity,
  getIpAddress,
  getUserAgent,
} from '@/lib/admin-audit-logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params
    
    // Verify admin authorization
    const adminVerification = await requireAdmin(request)
    if (!adminVerification.authorized) {
      console.error('[AdminUserDetailAPI] Unauthorized access attempt', {
        adminUserId: adminVerification.userId,
        targetUid: uid
      })
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    console.info('[AdminUserDetailAPI] Fetching user details', {
      adminUserId: adminVerification.userId,
      targetUid: uid
    })

    // Get user from Firebase Auth with custom claims
    const authUser = await getUserWithClaims(uid)
    if (!authUser) {
      console.warn('[AdminUserDetailAPI] User not found', { uid })
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Fetch profile data from Firestore
    const profileDoc = await db.collection('profiles').doc(uid).get()
    const profileData = profileDoc.exists ? profileDoc.data() : null

    // Fetch subscription data from Firestore
    const subscriptionDoc = await db.collection('subscriptions').doc(uid).get()
    const subscriptionData = subscriptionDoc.exists ? subscriptionDoc.data() : null

    // Fetch recent tests (last 10) from testResults collection
    // Note: Removed orderBy to avoid Firestore index requirement - will sort client-side
    const recentTestsSnapshot = await db
      .collection('testResults')
      .where('userId', '==', uid)
      .limit(10)
      .get()

    const recentTests = recentTestsSnapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          mode: data.mode || 'Unknown',
          wpm: data.wpm || 0,
          accuracy: data.accuracy || 0,
          completedAt: data.completedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }
      })
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())

    // Construct enriched user object
    const enrichedUser = {
      // Auth data
      uid: authUser.uid,
      email: authUser.email || '',
      displayName: authUser.displayName || null,
      photoURL: authUser.photoURL || null,
      emailVerified: authUser.emailVerified || false,
      disabled: authUser.disabled || false,
      createdAt: authUser.metadata.creationTime || new Date().toISOString(),
      lastSignInTime: authUser.metadata.lastSignInTime || null,
      customClaims: authUser.customClaims || {},
      
      // Authentication provider data (NEW for Phase 7)
      providerData: authUser.providerData || [],

      // Profile data (Firestore)
      // Note: Profile uses nested stats object per FIRESTORE_SCHEMA
      profile: profileData
        ? {
            username: profileData.username || profileData.displayName || '',
            bio: profileData.bio || '',
            globalRank: profileData.stats?.rank || profileData.globalRank || 999999,
            testsCompleted: profileData.stats?.testsCompleted || profileData.testsCompleted || 0,
            bestWPM: profileData.bestWpm || profileData.stats?.avgWpm || 0,
            averageAccuracy: profileData.stats?.avgAcc || profileData.averageAccuracy || 0
          }
        : null,

      // Subscription data (Firestore)
      subscription: subscriptionData
        ? {
            tier: subscriptionData.tier || 'free',
            status: subscriptionData.status || 'active',
            aiGenerationCount: subscriptionData.aiGenerationCount || 0,
            lastAIGenerationReset:
              subscriptionData.lastAIGenerationReset?.toDate?.()?.toISOString() ||
              new Date().toISOString(),
            createdAt:
              subscriptionData.createdAt?.toDate?.()?.toISOString() ||
              new Date().toISOString(),
            updatedAt:
              subscriptionData.updatedAt?.toDate?.()?.toISOString() ||
              new Date().toISOString()
          }
        : null,

      // Recent tests
      recentTests
    }

    console.info('[AdminUserDetailAPI] User details fetched successfully', {
      adminUserId: adminVerification.userId,
      targetUid: uid,
      hasProfile: !!profileData,
      hasSubscription: !!subscriptionData,
      testCount: recentTests.length
    })

    return NextResponse.json({
      success: true,
      ...enrichedUser
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const { uid } = await params
    console.error('[AdminUserDetailAPI] Error fetching user details', {
      error: errorMessage,
      uid
    })

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch user details',
        error: errorMessage
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/admin/users/[uid]
 * Update user profile (email, username, displayName, bio)
 * Requires: Admin role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params
    
    // Verify admin authorization
    const adminVerification = await requireAdmin(request)
    if (!adminVerification.authorized) {
      console.error('[AdminUserEditAPI] Unauthorized access attempt', {
        adminUserId: adminVerification.userId,
        targetUid: uid
      })
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }
    const body = await request.json()
    const { email, displayName, username, bio } = body

    console.info('[AdminUserEditAPI] Updating user profile', {
      adminUserId: adminVerification.userId,
      targetUid: uid,
      fields: Object.keys(body)
    })

    // Get current user data for audit log
    const authUser = await getUserWithClaims(uid)
    if (!authUser) {
      console.warn('[AdminUserEditAPI] User not found', { uid })
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const profileRef = db.collection('profiles').doc(uid)
    const profileDoc = await profileRef.get()
    const currentProfile = profileDoc.exists ? profileDoc.data() : undefined

    const changes: Array<{ field: string; oldValue: any; newValue: any }> = []

    // Update email in Firebase Auth if changed
    if (email && email !== authUser.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, message: 'Invalid email format' },
          { status: 400 }
        )
      }

      try {
        await updateUserEmail(uid, email)
        changes.push({ field: 'email', oldValue: authUser.email, newValue: email })
        console.info('[AdminUserEditAPI] Email updated', { uid, oldEmail: authUser.email, newEmail: email })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[AdminUserEditAPI] Failed to update email', { uid, error: errorMessage })
        return NextResponse.json(
          { success: false, message: `Failed to update email: ${errorMessage}` },
          { status: 400 }
        )
      }
    }

    // Update displayName in Firebase Auth if changed
    if (displayName !== undefined && displayName !== authUser.displayName) {
      try {
        const { getAuth } = await import('firebase-admin/auth')
        await getAuth().updateUser(uid, { displayName })
        changes.push({ field: 'displayName', oldValue: authUser.displayName, newValue: displayName })
        console.info('[AdminUserEditAPI] Display name updated', { uid, oldName: authUser.displayName, newName: displayName })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[AdminUserEditAPI] Failed to update display name', { uid, error: errorMessage })
      }
    }

    // Update username in Firestore profile if changed
    if (username !== undefined && username !== currentProfile?.username) {
      // Check username uniqueness
      const usernameQuery = await db.collection('profiles')
        .where('username', '==', username)
        .limit(1)
        .get()

      if (!usernameQuery.empty && usernameQuery.docs[0].id !== uid) {
        return NextResponse.json(
          { success: false, message: 'Username already taken' },
          { status: 400 }
        )
      }

      changes.push({ field: 'username', oldValue: currentProfile?.username || null, newValue: username })
    }

    // Update bio in Firestore profile if changed
    if (bio !== undefined && bio !== currentProfile?.bio) {
      changes.push({ field: 'bio', oldValue: currentProfile?.bio || null, newValue: bio })
    }

    // Update Firestore profile if there are changes
    const profileUpdates: any = {}
    if (username !== undefined) profileUpdates.username = username
    if (bio !== undefined) profileUpdates.bio = bio
    if (displayName !== undefined) profileUpdates.displayName = displayName
    if (email !== undefined) profileUpdates.email = email

    if (Object.keys(profileUpdates).length > 0) {
      // Use set with merge to create profile if it doesn't exist
      await profileRef.set({
        ...profileUpdates,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true })
    }

    // Log to audit trail with centralized logger
    await logAdminAction({
      adminUserId: adminVerification.userId || 'unknown',
      adminEmail: adminVerification.email || 'unknown',
      adminRole: adminVerification.claims?.superAdmin ? 'superAdmin' : 'admin',
      actionType: AuditActionType.USER_PROFILE_UPDATED,
      actionCategory: AuditCategory.USER_MANAGEMENT,
      actionSeverity: AuditSeverity.NOTICE,
      actionDescription: 'Updated user profile',
      targetUserId: uid,
      targetUserEmail: authUser.email || undefined,
      changes,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
      apiEndpoint: request.url,
      success: true,
    })

    console.info('[AdminUserEditAPI] User profile updated successfully', {
      adminUserId: adminVerification.userId,
      targetUid: uid,
      changesCount: changes.length
    })

    return NextResponse.json({
      success: true,
      message: 'User profile updated successfully',
      changes
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const { uid } = await params
    console.error('[AdminUserEditAPI] Error updating user profile', {
      error: errorMessage,
      uid
    })

    // Log failed attempt
    try {
      const adminVerification = await requireAdmin(request)
      if (adminVerification.authorized) {
        await logAdminAction({
          adminUserId: adminVerification.userId || 'unknown',
          adminEmail: adminVerification.email || 'unknown',
          adminRole: adminVerification.claims?.superAdmin ? 'superAdmin' : 'admin',
          actionType: AuditActionType.USER_PROFILE_UPDATED,
          actionCategory: AuditCategory.USER_MANAGEMENT,
          actionSeverity: AuditSeverity.ERROR,
          actionDescription: 'Failed to update user profile',
          targetUserId: uid,
          ipAddress: getIpAddress(request),
          userAgent: getUserAgent(request),
          apiEndpoint: request.url,
          success: false,
          error: errorMessage,
        })
      }
    } catch (auditError) {
      console.error('[AdminUserEditAPI] Failed to log audit entry', { error: auditError })
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update user profile',
        error: errorMessage
      },
      { status: 500 }
    )
  }
}
