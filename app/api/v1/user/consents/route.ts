import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger, createApiContext, createTimingContext } from '@/lib/structured-logger';
import { CORRELATION_ID_HEADER } from '@/lib/correlation-id';
import { app } from '@/lib/firebase-admin';

/**
 * Consent Management API Routes
 * 
 * GET /api/v1/user/consents - Fetch user's consent preferences
 * POST /api/v1/user/consents - Update user's consent preferences
 * 
 * GDPR Compliance:
 * - Article 7: Conditions for consent
 * - Article 7(3): Right to withdraw consent
 * 
 * Consent Types:
 * - strictly_necessary: Always true (cannot be disabled)
 * - analytics: Optional (Google Analytics, performance tracking)
 * - functional: Optional (preferences, theme, language)
 * - advertising: Optional (currently not used, but documented for future)
 */

interface ConsentRecord {
  consentType: 'strictly_necessary' | 'analytics' | 'functional' | 'advertising';
  granted: boolean;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ConsentsDocument {
  userId: string;
  consents: {
    strictly_necessary: ConsentRecord;
    analytics?: ConsentRecord;
    functional?: ConsentRecord;
    advertising?: ConsentRecord;
  };
  lastUpdated: string;
}

/**
 * GET /api/v1/user/consents
 * Fetch user's current consent preferences
 */
async function handleGET(request: NextRequest) {
  const { startTime } = createTimingContext();
  const context = createApiContext(request, 'GET /api/v1/user/consents');
  
  try {
    logger.info(context, 'Fetching user consents');

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
    
    // 2. Verify ID token
    let decodedToken;
    try {
      const auth = getAuth(app);
      decodedToken = await auth.verifyIdToken(idToken);
      logger.info(context, 'ID token verified', { userId: decodedToken.uid });
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
    context.userId = userId;

    // 3. Fetch consents from Firestore
    const db = getFirestore(app);
    const consentsDoc = await db.collection('users').doc(userId).collection('consents').doc('preferences').get();

    if (!consentsDoc.exists) {
      // No consents saved yet - return defaults
      logger.info(context, 'No consents found, returning defaults');
      
      const defaultConsents: ConsentsDocument = {
        userId,
        consents: {
          strictly_necessary: {
            consentType: 'strictly_necessary',
            granted: true,
            timestamp: new Date().toISOString(),
          },
        },
        lastUpdated: new Date().toISOString(),
      };

      return NextResponse.json(defaultConsents, { status: 200 });
    }

    const consentsData = consentsDoc.data() as ConsentsDocument;
    logger.info(context, 'Consents fetched successfully', { 
      responseTime: Date.now() - startTime 
    });

    return NextResponse.json(consentsData, { status: 200 });

  } catch (error) {
    logger.error(context, 'Error fetching consents', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch consents',
        correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/user/consents
 * Update user's consent preferences
 * 
 * Request Body:
 * {
 *   "analytics": boolean,
 *   "functional": boolean,
 *   "advertising": boolean
 * }
 * 
 * Note: strictly_necessary is always true and cannot be changed
 */
async function handlePOST(request: NextRequest) {
  const { startTime } = createTimingContext();
  const context = createApiContext(request, 'POST /api/v1/user/consents');
  
  try {
    logger.info(context, 'Updating user consents');

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
    
    // 2. Verify ID token
    let decodedToken;
    try {
      const auth = getAuth(app);
      decodedToken = await auth.verifyIdToken(idToken);
      logger.info(context, 'ID token verified', { userId: decodedToken.uid });
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
    context.userId = userId;

    // 3. Parse request body
    let consentUpdates: {
      analytics?: boolean;
      functional?: boolean;
      advertising?: boolean;
    };

    try {
      consentUpdates = await request.json();
    } catch (parseError) {
      logger.error(context, 'Failed to parse request body');
      return NextResponse.json(
        { 
          error: 'Bad Request',
          message: 'Invalid request body',
          correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown'
        },
        { status: 400 }
      );
    }

    // 4. Validate consent types
    const validConsentTypes = ['analytics', 'functional', 'advertising'];
    const invalidKeys = Object.keys(consentUpdates).filter(key => !validConsentTypes.includes(key));
    
    if (invalidKeys.length > 0) {
      logger.warn(context, 'Invalid consent types in request', { invalidKeys });
      return NextResponse.json(
        { 
          error: 'Bad Request',
          message: `Invalid consent types: ${invalidKeys.join(', ')}`,
          validTypes: validConsentTypes,
          correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown'
        },
        { status: 400 }
      );
    }

    // 5. Build consent document
    const timestamp = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    const consentsDocument: ConsentsDocument = {
      userId,
      consents: {
        strictly_necessary: {
          consentType: 'strictly_necessary',
          granted: true,
          timestamp,
          userAgent,
          ipAddress,
        },
      },
      lastUpdated: timestamp,
    };

    // Add optional consents if provided
    if (consentUpdates.analytics !== undefined) {
      consentsDocument.consents.analytics = {
        consentType: 'analytics',
        granted: consentUpdates.analytics,
        timestamp,
        userAgent,
        ipAddress,
      };
    }

    if (consentUpdates.functional !== undefined) {
      consentsDocument.consents.functional = {
        consentType: 'functional',
        granted: consentUpdates.functional,
        timestamp,
        userAgent,
        ipAddress,
      };
    }

    if (consentUpdates.advertising !== undefined) {
      consentsDocument.consents.advertising = {
        consentType: 'advertising',
        granted: consentUpdates.advertising,
        timestamp,
        userAgent,
        ipAddress,
      };
    }

    // 6. Save to Firestore
    const db = getFirestore(app);
    await db.collection('users').doc(userId).collection('consents').doc('preferences').set(consentsDocument);

    logger.info(context, '✅ Consents updated successfully', { 
      analytics: consentUpdates.analytics,
      functional: consentUpdates.functional,
      advertising: consentUpdates.advertising,
      responseTime: Date.now() - startTime,
    });

    const response = NextResponse.json(
      { 
        success: true,
        message: 'Consents updated successfully',
        consents: consentsDocument,
        correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown'
      },
      { status: 200 }
    );

    const correlationId = request.headers.get(CORRELATION_ID_HEADER) || 'unknown';
    response.headers.set(CORRELATION_ID_HEADER, correlationId);

    return response;

  } catch (error) {
    logger.error(context, 'Error updating consents', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to update consents',
        correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown'
      },
      { status: 500 }
    );
  }
}

// Export handlers
export const GET = handleGET;
export const POST = handlePOST;
