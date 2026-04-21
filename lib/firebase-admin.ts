import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

let app: App;
let db: ReturnType<typeof getFirestore>;

function loadServiceAccountFromEnv() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    return null;
  }

  if (serviceAccountKey.startsWith('{')) {
    try {
      return JSON.parse(serviceAccountKey);
    } catch (error) {
      console.warn('⚠️ Invalid JSON in FIREBASE_SERVICE_ACCOUNT_KEY');
      return null;
    }
  }

  const serviceAccountPath = path.isAbsolute(serviceAccountKey)
    ? serviceAccountKey
    : path.join(process.cwd(), serviceAccountKey);

  if (fs.existsSync(serviceAccountPath)) {
    return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  }

  return null;
}

if (getApps().length === 0) {
  try {
    if (process.env.NODE_ENV === 'production') {
      const serviceAccount = loadServiceAccountFromEnv();

      if (serviceAccount) {
        console.log('🚀 Initializing Firebase Admin SDK in production with service account from environment');
        app = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "zentype-65eb3",
        });
        console.log('✅ Firebase Admin SDK initialized with service account credentials');
      } else {
        // Production fallback: use ADC for same-project deployments.
        console.log('🚀 Initializing Firebase Admin SDK in production with ADC');
        app = initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "zentype-65eb3",
        });
        console.log('✅ Firebase Admin SDK initialized with Application Default Credentials');
      }
    } else {
      // Development: Try multiple approaches
      const serviceAccount = loadServiceAccountFromEnv();
      
      if (serviceAccount) {
        app = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "zentype-65eb3",
        });
      } else {
        // Fallback to default credentials (Firebase CLI or Google Cloud SDK)
        console.warn('⚠️ Service account not found, using default credentials');
        app = initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "zentype-65eb3",
        });
      }
    }
    
    db = getFirestore(app);
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    // Don't throw error in development, allow graceful degradation
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Firebase Admin SDK initialization failed');
    } else {
      console.warn('⚠️ Continuing without Firebase Admin SDK in development mode');
      // Create a mock app for development
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "zentype-65eb3",
      });
      db = getFirestore(app);
    }
  }
} else {
  app = getApps()[0];
  db = getFirestore(app);
}

export { app, db };

// ============================================
// ADMIN PANEL UTILITIES
// Added: November 17, 2025
// ============================================

import { getAuth } from 'firebase-admin/auth';
import type { AdminClaims } from './types/database';

/**
 * Verify admin token and extract custom claims
 * Use this in admin API routes to verify authentication
 * 
 * @param idToken - Firebase ID token from Authorization header
 * @returns Decoded token with custom claims or null if invalid
 * 
 * @example
 * const token = request.headers.get('Authorization')?.replace('Bearer ', '');
 * const decodedToken = await verifyAdminToken(token);
 * if (!decodedToken?.admin) {
 *   return Response.json({ error: 'Unauthorized' }, { status: 403 });
 * }
 */
export async function verifyAdminToken(idToken: string | undefined) {
  if (!idToken) {
    console.warn('[Admin Auth] No ID token provided');
    return null;
  }

  try {
    if (!app) {
      console.error('[Admin Auth] Firebase Admin SDK not initialized');
      return null;
    }

    const auth = getAuth(app);
    const decodedToken = await auth.verifyIdToken(idToken);
    
    console.log('[Admin Auth] Token verified', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      admin: decodedToken.admin || false,
      superAdmin: decodedToken.superAdmin || false,
    });

    return decodedToken;
  } catch (error) {
    console.error('[Admin Auth] Token verification failed:', error);
    return null;
  }
}

/**
 * Set custom claims for a user (admin role management)
 * Only callable by Super Admins
 * 
 * @param userId - Firebase UID of user to modify
 * @param claims - Custom claims to set (admin, superAdmin, etc.)
 * @param removeUnspecified - If true, removes all admin claims not in the claims object (default: false)
 * @returns Success boolean
 * 
 * @example
 * // Grant admin role
 * await setUserCustomClaims('user123', { admin: true });
 * 
 * // Grant super admin role
 * await setUserCustomClaims('user123', { admin: true, superAdmin: true });
 * 
 * // Revoke all admin roles (MUST set to false explicitly)
 * await setUserCustomClaims('user123', { admin: false, superAdmin: false });
 * 
 * // Remove ALL admin claims (use removeUnspecified flag)
 * await setUserCustomClaims('user123', {}, true);
 */
export async function setUserCustomClaims(
  userId: string,
  claims: Partial<AdminClaims>,
  removeUnspecified: boolean = false
): Promise<boolean> {
  try {
    if (!app) {
      console.error('[Admin SDK] Firebase Admin not initialized');
      return false;
    }

    const auth = getAuth(app);
    
    // Get existing custom claims
    const user = await auth.getUser(userId);
    const existingClaims = user.customClaims || {};
    
    let updatedClaims: Record<string, any>;
    
    if (removeUnspecified) {
      // Remove all admin-related claims not in new claims object
      // This mode explicitly removes undefined claims
      const allAdminClaimKeys = [
        'admin',
        'superAdmin',
        'canDeleteUsers',
        'canManageSubscriptions',
        'canViewAuditLogs',
        'canManageSettings',
      ];
      
      updatedClaims = { ...existingClaims };
      
      // Set all admin claims to false unless explicitly set in new claims
      allAdminClaimKeys.forEach((key) => {
        if (claims[key as keyof AdminClaims] !== undefined) {
          updatedClaims[key] = claims[key as keyof AdminClaims];
        } else {
          // Remove claim by deleting the key (Firebase will remove it)
          delete updatedClaims[key];
        }
      });
    } else {
      // Standard merge mode: preserve existing claims, override with new values
      updatedClaims = {
        ...existingClaims,
        ...claims,
      };
      
      // Explicitly remove claims set to false or null
      Object.keys(updatedClaims).forEach((key) => {
        if (updatedClaims[key] === false || updatedClaims[key] === null) {
          delete updatedClaims[key];
        }
      });
    }

    await auth.setCustomUserClaims(userId, updatedClaims);
    
    console.log('[Admin SDK] Custom claims updated', {
      userId,
      email: user.email,
      newClaims: claims,
      removeUnspecified,
      finalClaims: updatedClaims,
    });

    return true;
  } catch (error) {
    console.error('[Admin SDK] Failed to set custom claims:', error);
    return false;
  }
}

/**
 * Revoke all refresh tokens for a user (force logout)
 * Use this when demoting admin or for security purposes
 * 
 * @param userId - Firebase UID of user to logout
 * @returns Success boolean
 * 
 * @example
 * // Force user logout after role change
 * await revokeUserSessions('user123');
 */
export async function revokeUserSessions(userId: string): Promise<boolean> {
  try {
    if (!app) {
      console.error('[Admin SDK] Firebase Admin not initialized');
      return false;
    }

    const auth = getAuth(app);
    await auth.revokeRefreshTokens(userId);
    
    console.log('[Admin SDK] User sessions revoked', { userId });
    return true;
  } catch (error) {
    console.error('[Admin SDK] Failed to revoke sessions:', error);
    return false;
  }
}

/**
 * Get user by UID with custom claims
 * Use this to check current admin status
 * 
 * @param userId - Firebase UID
 * @returns User record with custom claims or null
 */
export async function getUserWithClaims(userId: string) {
  try {
    if (!app) {
      console.error('[Admin SDK] Firebase Admin not initialized');
      return null;
    }

    const auth = getAuth(app);
    const user = await auth.getUser(userId);
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      customClaims: user.customClaims as AdminClaims | undefined,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
      },
      providerData: user.providerData, // Phase 7: Authentication provider info
    };
  } catch (error) {
    console.error('[Admin SDK] Failed to get user:', error);
    return null;
  }
}

/**
 * List all users with pagination
 * For admin dashboard user list view
 * 
 * @param pageToken - Optional page token from previous query
 * @param maxResults - Maximum number of users to return (default 1000, max 1000)
 * @returns List of users and nextPageToken
 */
export async function listUsers(pageToken?: string, maxResults: number = 100) {
  try {
    if (!app) {
      console.error('[Admin SDK] Firebase Admin not initialized');
      return null;
    }

    const auth = getAuth(app);
    const listUsersResult = await auth.listUsers(maxResults, pageToken);
    
    return {
      users: listUsersResult.users.map(user => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        customClaims: user.customClaims as AdminClaims | undefined,
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime,
        },
      })),
      pageToken: listUsersResult.pageToken,
    };
  } catch (error) {
    console.error('[Admin SDK] Failed to list users:', error);
    return null;
  }
}

/**
 * Delete a user account (integrates with GDPR deletion extension)
 * WARNING: This is irreversible
 * 
 * @param userId - Firebase UID to delete
 * @returns Success boolean
 */
export async function deleteUserAccount(userId: string): Promise<boolean> {
  try {
    if (!app) {
      console.error('[Admin SDK] Firebase Admin not initialized');
      return false;
    }

    const auth = getAuth(app);
    await auth.deleteUser(userId);
    
    console.log('[Admin SDK] User account deleted', { userId });
    // Note: Firebase Extension delete-user-data-gdpr will automatically
    // clean up Firestore data (subscriptions, testResults, etc.)
    
    return true;
  } catch (error) {
    console.error('[Admin SDK] Failed to delete user:', error);
    return false;
  }
}

/**
 * Update user email address
 * User must re-authenticate after this change
 * 
 * @param userId - Firebase UID
 * @param newEmail - New email address
 * @returns Success boolean
 */
export async function updateUserEmail(
  userId: string,
  newEmail: string
): Promise<boolean> {
  try {
    if (!app) {
      console.error('[Admin SDK] Firebase Admin not initialized');
      return false;
    }

    const auth = getAuth(app);
    await auth.updateUser(userId, { email: newEmail });
    
    console.log('[Admin SDK] User email updated', { userId, newEmail });
    return true;
  } catch (error) {
    console.error('[Admin SDK] Failed to update email:', error);
    return false;
  }
}