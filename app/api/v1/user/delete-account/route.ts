import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { logger, createApiContext, createTimingContext } from '@/lib/structured-logger';
import { CORRELATION_ID_HEADER } from '@/lib/correlation-id';
import { app } from '@/lib/firebase-admin';

/**
 * DELETE /api/v1/user/delete-account
 * 
 * GDPR-compliant account deletion endpoint (Article 17: Right to Erasure)
 * 
 * Security Requirements:
 * - Recent authentication required (<5 minutes)
 * - Confirmation text must match "DELETE"
 * - Valid Firebase ID token
 * 
 * Deletion Process:
 * 1. Verify ID token and user authentication
 * 2. Check authentication time (<5 minutes)
 * 3. Validate confirmation text
 * 4. Delete user from Firebase Auth (triggers Firebase Extension)
 * 5. Extension automatically deletes Firestore data
 * 
 * Firebase Extension: delete-user-data-gdpr
 * - Paths: users/{UID}, testResults/{UID}, aiTests/{UID}
 * - Auto-discovery enabled (depth: 5, fields: userId, uid, createdBy)
 * - Location: europe-west1 (Belgium)
 */
async function handleDELETE(request: NextRequest) {
  const { startTime } = createTimingContext();
  const context = createApiContext(request, 'DELETE /api/v1/user/delete-account');
  
  try {
    logger.info(context, 'Account deletion request initiated');

    // 1. Extract and verify ID token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(context, 'Missing or invalid authorization header');
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Valid ID token required',
          correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown'
        },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // 2. Verify ID token with Firebase Admin SDK
    let decodedToken;
    try {
      const auth = getAuth(app);
      decodedToken = await auth.verifyIdToken(idToken);
      logger.info(context, 'ID token verified successfully', { 
        userId: decodedToken.uid,
        email: decodedToken.email 
      });
    } catch (tokenError) {
      logger.error(context, 'ID token verification failed', { 
        error: tokenError instanceof Error ? tokenError.message : 'Unknown error'
      });
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Invalid or expired ID token',
          correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown'
        },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email || 'unknown';

    // Update context with userId
    context.userId = userId;

    // 3. Check recent authentication (GDPR security requirement)
    const authTime = decodedToken.auth_time;
    const now = Math.floor(Date.now() / 1000);
    const timeSinceAuth = now - authTime;
    const MAX_AUTH_AGE_SECONDS = 300; // 5 minutes

    if (timeSinceAuth > MAX_AUTH_AGE_SECONDS) {
      logger.warn(context, 'Re-authentication required', { 
        timeSinceAuth,
        maxAllowed: MAX_AUTH_AGE_SECONDS 
      });
      return NextResponse.json(
        { 
          error: 'Re-authentication required',
          message: 'For security, you must re-enter your password to delete your account',
          timeSinceAuth,
          correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown'
        },
        { status: 403 }
      );
    }

    logger.info(context, 'Recent authentication verified', { timeSinceAuth });

    // 4. Parse request body
    let confirmationText: string;
    try {
      const body = await request.json();
      confirmationText = body.confirmationText;
    } catch (parseError) {
      logger.error(context, 'Failed to parse request body', { 
        error: parseError instanceof Error ? parseError.message : 'Unknown error'
      });
      return NextResponse.json(
        { 
          error: 'Bad Request',
          message: 'Invalid request body',
          correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown'
        },
        { status: 400 }
      );
    }

    // 5. Validate confirmation text
    const REQUIRED_CONFIRMATION = 'DELETE';
    if (confirmationText !== REQUIRED_CONFIRMATION) {
      logger.warn(context, 'Invalid confirmation text', { 
        provided: confirmationText,
        required: REQUIRED_CONFIRMATION 
      });
      return NextResponse.json(
        { 
          error: 'Invalid confirmation',
          message: `You must type "${REQUIRED_CONFIRMATION}" to confirm account deletion`,
          correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown'
        },
        { status: 400 }
      );
    }

    logger.info(context, 'Confirmation text validated');

    // 6. Delete user from Firebase Auth
    // This triggers the Firebase Extension "delete-user-data-gdpr"
    // Extension will automatically delete all Firestore data:
    // - /users/{UID}
    // - /testResults/{UID}
    // - /aiTests/{UID}
    // - Any documents with userId, uid, or createdBy fields (auto-discovery)
    try {
      const auth = getAuth(app);
      await auth.deleteUser(userId);
      
      logger.info(context, '✅ User account deleted from Firebase Auth', { 
        userId,
        email: userEmail,
        timestamp: new Date().toISOString(),
        extensionTriggered: true 
      });

      // 7. Return success response
      const response = NextResponse.json(
        { 
          success: true,
          message: 'Account deleted successfully',
          userId,
          deletionTimestamp: new Date().toISOString(),
          correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown',
          note: 'All user data will be removed within 24 hours as per GDPR requirements'
        },
        { status: 200 }
      );

      const correlationId = request.headers.get(CORRELATION_ID_HEADER) || 'unknown';
      response.headers.set(CORRELATION_ID_HEADER, correlationId);

      logger.info(context, 'Account deletion completed successfully', { 
        responseTime: Date.now() - startTime 
      });

      return response;

    } catch (deleteError) {
      // Critical error: Failed to delete user
      logger.error(context, '❌ CRITICAL: Failed to delete user account', { 
        userId,
        email: userEmail,
        error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
        stack: deleteError instanceof Error ? deleteError.stack : undefined,
        responseTime: Date.now() - startTime
      });

      return NextResponse.json(
        { 
          error: 'Deletion failed',
          message: 'Unable to delete account. Please contact support.',
          correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown',
          details: deleteError instanceof Error ? deleteError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    // Unexpected error
    logger.error(context, '❌ Unexpected error in account deletion', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: Date.now() - startTime 
    });

    const errorResponse = NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown'
      },
      { status: 500 }
    );
    
    const correlationId = request.headers.get(CORRELATION_ID_HEADER) || 'unknown';
    errorResponse.headers.set(CORRELATION_ID_HEADER, correlationId);
    return errorResponse;
  }
}

// Export DELETE handler
export const DELETE = handleDELETE;
