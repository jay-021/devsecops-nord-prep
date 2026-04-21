import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger, createApiContext, createTimingContext } from '@/lib/structured-logger';
import { CORRELATION_ID_HEADER } from '@/lib/correlation-id';
import { app } from '@/lib/firebase-admin';

/**
 * Sanitizes export data to protect internal system details while maintaining GDPR compliance
 * 
 * Security Improvements:
 * - Masks Firebase UIDs (keeps format but hides actual ID)
 * - Removes correlation IDs (internal debugging)
 * - Converts Firebase timestamps to ISO 8601 format
 * - Masks IP addresses (shows format but not actual IP)
 * - Removes redundant userId fields from nested objects
 * 
 * GDPR Compliance Maintained:
 * - All user data preserved (tests, consents, profile)
 * - Data remains machine-readable and portable
 * - Satisfies Article 15 (Right to Access) and Article 20 (Data Portability)
 */
function sanitizeExportData(data: any): any {
  // Helper: Mask UID (e.g., "Xp4sOxt0xeSeQipDXKqXQRlgp983" → "user_***************p983")
  const maskUid = (uid: string): string => {
    if (!uid || uid.length < 8) return uid;
    return `user_***************${uid.slice(-4)}`;
  };

  // Helper: Mask IP address (e.g., "192.168.1.1" → "xxx.xxx.xxx.xxx")
  const maskIp = (ip: string): string => {
    if (!ip) return ip;
    if (ip === '::1' || ip === 'localhost') return 'xxx.xxx.xxx.xxx (localhost)';
    return 'xxx.xxx.xxx.xxx';
  };

  // Helper: Convert Firebase Timestamp to ISO 8601
  const convertTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    if (timestamp._seconds !== undefined) {
      // Firebase Timestamp object
      return new Date(timestamp._seconds * 1000).toISOString();
    }
    return timestamp; // Already a string
  };

  // Helper: Sanitize a single test result
  const sanitizeTestResult = (test: any): any => {
    const sanitized = { ...test };
    
    // Remove internal IDs
    delete sanitized.userId; // Redundant (it's their export)
    delete sanitized.correlationId; // Internal debugging ID
    
    // Convert Firebase timestamps to ISO
    if (sanitized.createdAt) {
      sanitized.createdAt = convertTimestamp(sanitized.createdAt);
    }
    
    return sanitized;
  };

  // Helper: Sanitize consent records
  const sanitizeConsent = (consent: any): any => {
    const sanitized = { ...consent };
    
    // Remove redundant userId
    delete sanitized.userId;
    
    // Mask IP addresses in consent records
    if (sanitized.consents) {
      Object.keys(sanitized.consents).forEach(key => {
        if (sanitized.consents[key].ipAddress) {
          sanitized.consents[key].ipAddress = maskIp(sanitized.consents[key].ipAddress);
        }
      });
    }
    
    return sanitized;
  };

  // Start sanitization
  const sanitized = {
    ...data,
    exportMetadata: {
      ...data.exportMetadata,
      userId: maskUid(data.exportMetadata.userId),
      _security: 'Internal identifiers have been masked for security',
    },
  };

  // Sanitize userData section
  if (data.userData) {
    sanitized.userData = { ...data.userData };

    // Sanitize profile
    if (data.userData.profile) {
      sanitized.userData.profile = {
        ...data.userData.profile,
        uid: maskUid(data.userData.profile.uid),
      };
    }

    // Sanitize test results
    if (data.userData.testResults) {
      sanitized.userData.testResults = {
        ...data.userData.testResults,
        results: data.userData.testResults.results.map(sanitizeTestResult),
      };
    }

    // Sanitize AI-generated tests
    if (data.userData.aiGeneratedTests) {
      sanitized.userData.aiGeneratedTests = {
        ...data.userData.aiGeneratedTests,
        tests: data.userData.aiGeneratedTests.tests.map((test: any) => {
          const sanitized = { ...test };
          delete sanitized.createdBy; // Redundant (it's their export)
          delete sanitized.correlationId;
          if (sanitized.createdAt) {
            sanitized.createdAt = convertTimestamp(sanitized.createdAt);
          }
          return sanitized;
        }),
      };
    }

    // Sanitize consent records
    if (data.userData.consents) {
      sanitized.userData.consents = {
        ...data.userData.consents,
        records: data.userData.consents.records.map(sanitizeConsent),
      };
    }

    // Sanitize authentication data
    if (data.userData.authenticationData) {
      sanitized.userData.authenticationData = {
        ...data.userData.authenticationData,
        uid: maskUid(data.userData.authenticationData.uid),
      };
    }
  }

  return sanitized;
}

/**
 * GET /api/v1/user/export-data
 * 
 * GDPR-compliant data export endpoint (Article 15: Right to Access)
 * 
 * Allows users to download all their personal data in machine-readable JSON format
 * 
 * Security Requirements:
 * - Valid Firebase ID token required
 * - Only exports requesting user's data
 * 
 * Data Exported:
 * - User profile (username, email, bio, preferences)
 * - User settings (theme, font, keyboard sounds, etc.)
 * - Test results (all typing test history)
 * - AI-generated tests (custom tests created by user)
 * - Consent records (cookie/privacy consents)
 * - Account metadata (creation date, stats)
 * 
 * Response Format: JSON
 */
async function handleGET(request: NextRequest) {
  const { startTime } = createTimingContext();
  const context = createApiContext(request, 'GET /api/v1/user/export-data');
  
  try {
    logger.info(context, 'Data export request initiated');

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

    logger.info(context, 'Starting data export', { userId, email: userEmail });

    // 3. Fetch all user data from Firestore
    const db = getFirestore(app);
    const exportData: any = {
      exportMetadata: {
        userId,
        exportDate: new Date().toISOString(),
        exportType: 'complete',
        dataProtectionRegulation: 'GDPR Article 15 - Right to Access',
      },
      userData: {},
    };

    try {
      // 3a. Fetch user profile
      logger.info(context, 'Fetching user profile');
      const profileDoc = await db.collection('users').doc(userId).get();
      if (profileDoc.exists) {
        exportData.userData.profile = {
          ...profileDoc.data(),
          _note: 'Your basic profile information',
        };
        logger.info(context, 'User profile fetched');
      }

      // 3b. Fetch test results
      logger.info(context, 'Fetching test results');
      const testResultsSnapshot = await db.collection('testResults')
        .where('userId', '==', userId)
        .get();
      
      exportData.userData.testResults = {
        count: testResultsSnapshot.size,
        results: testResultsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })),
        _note: 'Your typing test history and performance data',
      };
      logger.info(context, 'Test results fetched', { count: testResultsSnapshot.size });

      // 3c. Fetch AI-generated tests
      logger.info(context, 'Fetching AI-generated tests');
      const aiTestsSnapshot = await db.collection('aiTests')
        .where('createdBy', '==', userId)
        .get();
      
      exportData.userData.aiGeneratedTests = {
        count: aiTestsSnapshot.size,
        tests: aiTestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })),
        _note: 'Custom typing tests you created using AI',
      };
      logger.info(context, 'AI-generated tests fetched', { count: aiTestsSnapshot.size });

      // 3d. Fetch consent records (if they exist)
      logger.info(context, 'Fetching consent records');
      const consentsDoc = await db.collection('users').doc(userId).collection('consents').get();
      
      if (!consentsDoc.empty) {
        exportData.userData.consents = {
          records: consentsDoc.docs.map(doc => ({
            consentType: doc.id,
            ...doc.data(),
          })),
          _note: 'Your cookie and privacy consent preferences',
        };
        logger.info(context, 'Consent records fetched', { count: consentsDoc.size });
      } else {
        exportData.userData.consents = {
          records: [],
          _note: 'No consent records found',
        };
      }

      // 3e. Fetch authentication data (from Firebase Auth, not Firestore)
      logger.info(context, 'Fetching authentication metadata');
      const auth = getAuth(app);
      const userRecord = await auth.getUser(userId);
      
      exportData.userData.authenticationData = {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        lastRefreshTime: userRecord.metadata.lastRefreshTime,
        _note: 'Your account authentication information',
        _security: 'Password is hashed and not included in exports',
      };
      logger.info(context, 'Authentication metadata fetched');

      // 4. Add data processor information (GDPR transparency)
      exportData.dataProcessors = {
        primary: {
          name: 'Google Cloud Platform / Firebase',
          purpose: 'Data storage and processing',
          location: 'europe-west1 (Belgium, EU)',
          dataProcessingAgreement: 'https://cloud.google.com/terms/data-processing-addendum',
        },
        _note: 'Third parties that process your data on our behalf',
      };

      // 5. Add legal information
      exportData.legalInformation = {
        regulation: 'GDPR (General Data Protection Regulation)',
        yourRights: [
          'Right to Access (Article 15) - You are exercising this right now',
          'Right to Rectification (Article 16) - Update your data in Settings',
          'Right to Erasure (Article 17) - Delete your account in Settings > Danger Zone',
          'Right to Restrict Processing (Article 18) - Manage consents in Settings > Privacy',
          'Right to Data Portability (Article 20) - This export file',
          'Right to Object (Article 21) - Opt-out in Settings > Privacy',
          'Rights related to Automated Decision Making (Article 22) - AI usage disclosed',
          'Right to Withdraw Consent (Article 7) - Manage in Settings > Privacy',
        ],
        dataController: {
          name: 'ZenType',
          contact: 'Zen-type@outlook.com',
        },
        _note: 'Your rights under GDPR',
      };

      logger.info(context, 'Data export completed successfully', { 
        profileIncluded: !!exportData.userData.profile,
        testResultsCount: exportData.userData.testResults.count,
        aiTestsCount: exportData.userData.aiGeneratedTests.count,
        responseTime: Date.now() - startTime,
      });

      // 6. Sanitize export data (remove internal identifiers for security)
      logger.info(context, 'Sanitizing export data for security');
      const sanitizedData = sanitizeExportData(exportData);

      // 7. Return JSON export
      const response = NextResponse.json(sanitizedData, { 
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename="zentype-data-export-${userId}-${Date.now()}.json"`,
          'Content-Type': 'application/json',
        },
      });

      const correlationId = request.headers.get(CORRELATION_ID_HEADER) || 'unknown';
      response.headers.set(CORRELATION_ID_HEADER, correlationId);

      return response;

    } catch (fetchError) {
      // Error fetching data from Firestore
      logger.error(context, 'Failed to fetch user data from Firestore', { 
        userId,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
        responseTime: Date.now() - startTime,
      });

      return NextResponse.json(
        { 
          error: 'Data export failed',
          message: 'Unable to retrieve user data. Please try again later.',
          correlationId: request.headers.get(CORRELATION_ID_HEADER) || 'unknown',
        },
        { status: 500 }
      );
    }

  } catch (error) {
    // Unexpected error
    logger.error(context, 'Unexpected error in data export', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: Date.now() - startTime,
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

// Export GET handler
export const GET = handleGET;
