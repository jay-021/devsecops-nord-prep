import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { logger, createApiContext, createTimingContext } from '@/lib/structured-logger';
import { CORRELATION_ID_HEADER } from '@/lib/correlation-id';
import { withPerformanceMonitoring } from '@/src/lib/performance-middleware';
import { getAuth } from 'firebase-admin/auth';

interface TestResultData {
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  textLength: number;
  userInput: string;
  testType: string;
  difficulty: string;
  testId: string;
}

async function handlePOST(request: NextRequest) {
  const { startTime } = createTimingContext();
  const context = createApiContext(request, 'POST /api/v1/submit-test-result');
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) || `v1-submit-${Date.now()}`;
  
  try {
    logger.info(context, 'V1 API Route: submit-test-result called', { 
      correlationId,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')?.substring(0, 100)
    });

    // Enhanced Firebase Admin SDK validation
    if (!db) {
      logger.error(context, new Error('Firebase Admin SDK not initialized'), { 
        correlationId,
        step: 'FIREBASE_VALIDATION'
      });
      throw new Error('Firebase Admin SDK not initialized');
    }

    logger.info(context, 'Firebase Admin SDK validated successfully', { 
      correlationId,
      step: 'FIREBASE_VALIDATED'
    });

    // Enhanced authentication with detailed logging
    const authHeader = request.headers.get('authorization');
    logger.info(context, 'Authentication validation started', { 
      correlationId,
      authHeaderPresent: !!authHeader,
      authHeaderFormat: authHeader ? (authHeader.startsWith('Bearer ') ? 'Bearer format' : 'Invalid format') : 'Missing',
      step: 'AUTH_VALIDATION_START'
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(context, 'Invalid or missing authorization header', { 
        correlationId,
        authHeader: authHeader ? 'Present but invalid format' : 'Missing',
        step: 'AUTH_VALIDATION_FAILED'
      });
      
      const errorResponse = NextResponse.json(
        { 
          error: 'Authentication required', 
          details: 'Valid Bearer token required',
          correlationId
        },
        { status: 401 }
      );
      errorResponse.headers.set(CORRELATION_ID_HEADER, correlationId);
      logger.logRequest(context, startTime, 401, { reason: 'Missing auth header' });
      return errorResponse;
    }

    const idToken = authHeader.split('Bearer ')[1];
    logger.info(context, 'ID token extracted', { 
      correlationId,
      tokenLength: idToken.length,
      tokenPrefix: idToken.substring(0, 20) + '...',
      step: 'TOKEN_EXTRACTED'
    });

    let decodedToken;
    let userId: string;

    try {
      const auth = getAuth();
      decodedToken = await auth.verifyIdToken(idToken);
      userId = decodedToken.uid;
      
      logger.info(context, 'Token verification successful', { 
        correlationId,
        userId: userId,
        userEmail: decodedToken.email || 'No email',
        tokenIssuer: decodedToken.iss,
        tokenAudience: decodedToken.aud,
        step: 'TOKEN_VERIFIED'
      });
    } catch (authError) {
      logger.error(context, authError instanceof Error ? authError : new Error(String(authError)), {
        correlationId,
        errorCode: (authError as any)?.code,
        errorMessage: (authError as any)?.message,
        step: 'TOKEN_VERIFICATION_FAILED'
      });
      
      const errorResponse = NextResponse.json(
        { 
          error: 'Invalid authentication token', 
          details: authError instanceof Error ? authError.message : 'Token verification failed',
          correlationId
        },
        { status: 401 }
      );
      errorResponse.headers.set(CORRELATION_ID_HEADER, correlationId);
      logger.logRequest(context, startTime, 401, { reason: 'Token verification failed' });
      return errorResponse;
    }

    // Enhanced request body parsing with validation
    let testData: TestResultData;
    try {
      testData = await request.json();
      logger.info(context, 'Request body parsed successfully', { 
        correlationId,
        userId,
        dataKeys: Object.keys(testData),
        wpm: testData.wpm,
        accuracy: testData.accuracy,
        testType: testData.testType,
        difficulty: testData.difficulty,
        step: 'REQUEST_PARSED'
      });
    } catch (parseError) {
      logger.error(context, parseError instanceof Error ? parseError : new Error(String(parseError)), {
        correlationId,
        userId,
        step: 'REQUEST_PARSE_FAILED'
      });
      
      const errorResponse = NextResponse.json(
        { 
          error: 'Invalid request body', 
          details: 'Request body must be valid JSON',
          correlationId
        },
        { status: 400 }
      );
      errorResponse.headers.set(CORRELATION_ID_HEADER, correlationId);
      logger.logRequest(context, startTime, 400, { reason: 'JSON parse failed' });
      return errorResponse;
    }

    // Enhanced data validation with detailed error reporting
    const validationErrors: string[] = [];
    
    if (typeof testData.wpm !== 'number' || testData.wpm < 0 || testData.wpm > 400) {
      validationErrors.push('WPM must be a number between 0 and 400');
    }
    if (typeof testData.accuracy !== 'number' || testData.accuracy < 0 || testData.accuracy > 100) {
      validationErrors.push('Accuracy must be a number between 0 and 100');
    }
    if (typeof testData.errors !== 'number' || testData.errors < 0) {
      validationErrors.push('Errors must be a non-negative number');
    }
    if (typeof testData.timeTaken !== 'number' || testData.timeTaken <= 0) {
      validationErrors.push('Time taken must be a positive number');
    }
    if (typeof testData.textLength !== 'number' || testData.textLength <= 0) {
      validationErrors.push('Text length must be a positive number');
    }
    if (!testData.userInput || typeof testData.userInput !== 'string') {
      validationErrors.push('User input is required and must be a string');
    }
    if (!testData.testType || typeof testData.testType !== 'string') {
      validationErrors.push('Test type is required and must be a string');
    }
    if (!testData.difficulty || typeof testData.difficulty !== 'string') {
      validationErrors.push('Difficulty is required and must be a string');
    }
    if (!testData.testId || typeof testData.testId !== 'string') {
      validationErrors.push('Test ID is required and must be a string');
    }

    if (validationErrors.length > 0) {
      logger.warn(context, 'Data validation failed', { 
        correlationId,
        userId,
        validationErrors,
        receivedData: {
          wpm: testData.wpm,
          accuracy: testData.accuracy,
          errors: testData.errors,
          timeTaken: testData.timeTaken,
          textLength: testData.textLength,
          testType: testData.testType,
          difficulty: testData.difficulty,
          testId: testData.testId
        },
        step: 'VALIDATION_FAILED'
      });
      
      const errorResponse = NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationErrors,
          correlationId
        },
        { status: 400 }
      );
      errorResponse.headers.set(CORRELATION_ID_HEADER, correlationId);
      logger.logRequest(context, startTime, 400, { validationErrors });
      return errorResponse;
    }

    logger.info(context, 'Data validation passed', { 
      correlationId,
      userId,
      step: 'VALIDATION_PASSED'
    });

    // Enhanced Firestore write with Admin SDK pattern
    const testResultData = {
      userId: userId,
      wpm: testData.wpm,
      accuracy: testData.accuracy,
      errors: testData.errors,
      timeTaken: testData.timeTaken,
      textLength: testData.textLength,
      userInput: testData.userInput,
      testType: testData.testType,
      difficulty: testData.difficulty,
      testId: testData.testId,
      createdAt: new Date(),
      correlationId: correlationId, // Add correlation ID for debugging
    };
    
    logger.info(context, 'Preparing Firestore write operation', { 
      correlationId,
      userId,
      collection: 'testResults',
      documentSize: JSON.stringify(testResultData).length,
      step: 'FIRESTORE_WRITE_PREP'
    });

    try {
      // Use Firestore transaction to ensure atomic operations
      await db.runTransaction(async (transaction) => {
        // STEP 1: PERFORM ALL READS FIRST (Firestore requirement)
        const userProfileRef = db.collection('profiles').doc(userId);
        const userProfileDoc = await transaction.get(userProfileRef);

        // Prepare leaderboard references for reads
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of current week (Saturday)
        weekEnd.setHours(23, 59, 59, 999);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const weeklyLeaderboardRef = db.collection('leaderboard_weekly').doc(userId);
        const monthlyLeaderboardRef = db.collection('leaderboard_monthly').doc(userId);

        // Perform all reads using Promise.all for efficiency
        const [existingWeeklyDoc, existingMonthlyDoc] = await Promise.all([
          transaction.get(weeklyLeaderboardRef),
          transaction.get(monthlyLeaderboardRef)
        ]);

        // Validate user profile exists
        if (!userProfileDoc.exists) {
          logger.warn(context, 'User profile not found during stats update', {
            correlationId,
            userId,
            step: 'PROFILE_NOT_FOUND'
          });
          throw new Error('User profile not found');
        }

        const userProfile = userProfileDoc.data();
        const currentStats = userProfile?.stats || {
          rank: "E",
          testsCompleted: 0,
          avgWpm: 0,
          avgAcc: 0,
          bestWpm: 0,
        };

        // Calculate new aggregate stats
        const newTestsCompleted = currentStats.testsCompleted + 1;
        
        // Calculate new average WPM
        const totalWpm = (currentStats.avgWpm * currentStats.testsCompleted) + testData.wpm;
        const newAvgWpm = Math.round(totalWpm / newTestsCompleted);
        
        // Calculate new average accuracy
        const totalAcc = (currentStats.avgAcc * currentStats.testsCompleted) + testData.accuracy;
        const newAvgAcc = Math.round(totalAcc / newTestsCompleted);

        // Calculate best WPM
        const newBestWpm = Math.max(currentStats.bestWpm || 0, testData.wpm);

        // Calculate rank based on average WPM
        let newRank = "E";
        if (newAvgWpm >= 80) newRank = "S";
        else if (newAvgWpm >= 60) newRank = "A";
        else if (newAvgWpm >= 40) newRank = "B";
        else if (newAvgWpm >= 20) newRank = "C";
        else if (newAvgWpm >= 10) newRank = "D";

        const updatedStats = {
          rank: newRank,
          testsCompleted: newTestsCompleted,
          avgWpm: newAvgWpm,
          avgAcc: newAvgAcc,
          bestWpm: newBestWpm,
        };

        // STEP 2: PREPARE ALL WRITE OPERATIONS (after all reads are complete)
        
        // Prepare test result write
        const testResultsRef = db.collection('testResults');
        const testResultDocRef = testResultsRef.doc(); // Generate new document reference
        
        // Prepare profile update
        const profileUpdates = {
          stats: updatedStats,
        };

        // Prepare all-time leaderboard data
        const leaderboardRef = db.collection('leaderboard_all_time').doc(userId);
        const leaderboardData = {
          userId: userId,
          username: userProfile?.username || 'Anonymous',
          email: userProfile?.email || decodedToken.email || '',
          rank: updatedStats.rank,
          avgWpm: updatedStats.avgWpm,
          avgAcc: updatedStats.avgAcc,
          bestWpm: updatedStats.bestWpm,
          testsCompleted: updatedStats.testsCompleted,
          lastTestDate: new Date(),
          testType: testData.testType,
          updatedAt: new Date(),
          createdAt: userProfile?.createdAt || new Date(),
          period: 'all-time'
        };

        // Prepare weekly leaderboard data
        let weeklyStats = updatedStats;
        
        if (existingWeeklyDoc.exists) {
          const existingWeeklyData = existingWeeklyDoc.data();
          // Check if it's the same week
          if (existingWeeklyData && existingWeeklyData.periodStart?.toDate() >= weekStart) {
            // Same week - update stats
            const weeklyTestsCompleted = (existingWeeklyData.testsCompleted || 0) + 1;
            const weeklyTotalWpm = ((existingWeeklyData.avgWpm || 0) * (existingWeeklyData.testsCompleted || 0)) + testData.wpm;
            const weeklyNewAvgWpm = Math.round(weeklyTotalWpm / weeklyTestsCompleted);
            const weeklyTotalAcc = ((existingWeeklyData.avgAcc || 0) * (existingWeeklyData.testsCompleted || 0)) + testData.accuracy;
            const weeklyNewAvgAcc = Math.round(weeklyTotalAcc / weeklyTestsCompleted);
            const weeklyNewBestWpm = Math.max(existingWeeklyData.bestWpm || 0, testData.wpm);
            
            weeklyStats = {
              ...weeklyStats,
              testsCompleted: weeklyTestsCompleted,
              avgWpm: weeklyNewAvgWpm,
              avgAcc: weeklyNewAvgAcc,
              bestWpm: weeklyNewBestWpm
            };
          } else {
            // New week - reset stats
            weeklyStats = {
              rank: newRank,
              testsCompleted: 1,
              avgWpm: testData.wpm,
              avgAcc: testData.accuracy,
              bestWpm: testData.wpm
            };
          }
        } else {
          // First entry for this user in weekly leaderboard
          weeklyStats = {
            rank: newRank,
            testsCompleted: 1,
            avgWpm: testData.wpm,
            avgAcc: testData.accuracy,
            bestWpm: testData.wpm
          };
        }

        const weeklyLeaderboardData = {
          userId: userId,
          username: userProfile?.username || 'Anonymous',
          email: userProfile?.email || decodedToken.email || '',
          avgWpm: weeklyStats.avgWpm,
          bestWpm: weeklyStats.bestWpm,
          avgAcc: weeklyStats.avgAcc,
          testsCompleted: weeklyStats.testsCompleted,
          rank: weeklyStats.rank,
          testType: testData.testType,
          lastTestDate: new Date(),
          updatedAt: new Date(),
          period: 'weekly',
          periodStart: weekStart,
          periodEnd: weekEnd
        };

        // Prepare monthly leaderboard data
        let monthlyStats = updatedStats;
        
        if (existingMonthlyDoc.exists) {
          const existingMonthlyData = existingMonthlyDoc.data();
          // Check if it's the same month
          if (existingMonthlyData && existingMonthlyData.periodStart?.toDate() >= monthStart) {
            // Same month - update stats
            const monthlyTestsCompleted = (existingMonthlyData.testsCompleted || 0) + 1;
            const monthlyTotalWpm = ((existingMonthlyData.avgWpm || 0) * (existingMonthlyData.testsCompleted || 0)) + testData.wpm;
            const monthlyNewAvgWpm = Math.round(monthlyTotalWpm / monthlyTestsCompleted);
            const monthlyTotalAcc = ((existingMonthlyData.avgAcc || 0) * (existingMonthlyData.testsCompleted || 0)) + testData.accuracy;
            const monthlyNewAvgAcc = Math.round(monthlyTotalAcc / monthlyTestsCompleted);
            const monthlyNewBestWpm = Math.max(existingMonthlyData.bestWpm || 0, testData.wpm);
            
            monthlyStats = {
              ...monthlyStats,
              testsCompleted: monthlyTestsCompleted,
              avgWpm: monthlyNewAvgWpm,
              avgAcc: monthlyNewAvgAcc,
              bestWpm: monthlyNewBestWpm
            };
          } else {
            // New month - reset stats
            monthlyStats = {
              rank: newRank,
              testsCompleted: 1,
              avgWpm: testData.wpm,
              avgAcc: testData.accuracy,
              bestWpm: testData.wpm
            };
          }
        } else {
          // First entry for this user in monthly leaderboard
          monthlyStats = {
            rank: newRank,
            testsCompleted: 1,
            avgWpm: testData.wpm,
            avgAcc: testData.accuracy,
            bestWpm: testData.wpm
          };
        }

        const monthlyLeaderboardData = {
          userId: userId,
          username: userProfile?.username || 'Anonymous',
          email: userProfile?.email || decodedToken.email || '',
          avgWpm: monthlyStats.avgWpm,
          bestWpm: monthlyStats.bestWpm,
          avgAcc: monthlyStats.avgAcc,
          testsCompleted: monthlyStats.testsCompleted,
          rank: monthlyStats.rank,
          testType: testData.testType,
          lastTestDate: new Date(),
          updatedAt: new Date(),
          period: 'monthly',
          periodStart: monthStart,
          periodEnd: monthEnd
        };

        // STEP 3: EXECUTE ALL WRITES ATOMICALLY
        transaction.set(testResultDocRef, testResultData);
        transaction.update(userProfileRef, profileUpdates);
        transaction.set(leaderboardRef, leaderboardData, { merge: true });
        transaction.set(weeklyLeaderboardRef, weeklyLeaderboardData, { merge: true });
        transaction.set(monthlyLeaderboardRef, monthlyLeaderboardData, { merge: true });
        
        logger.info(context, 'All transaction operations prepared and executed', { 
          correlationId,
          userId,
          operations: ['testResult', 'profile', 'allTime', 'weekly', 'monthly'],
          step: 'TRANSACTION_COMPLETED'
        });

        return testResultDocRef.id;
      });
      
      logger.info(context, 'Transaction completed successfully - test result saved and profile updated', { 
        correlationId,
        userId,
        step: 'TRANSACTION_SUCCESS'
      });

      // Enhanced success response
      const successResponse = NextResponse.json({ 
        success: true, 
        message: 'Test result saved and profile updated successfully',
        correlationId,
        timestamp: new Date().toISOString()
      });
      successResponse.headers.set(CORRELATION_ID_HEADER, correlationId);
      
      logger.logRequest(context, startTime, 200, { 
        transactionSuccess: true,
        profileUpdated: true
      });
      return successResponse;

    } catch (firestoreError) {
      logger.error(context, firestoreError instanceof Error ? firestoreError : new Error(String(firestoreError)), {
        correlationId,
        userId,
        errorCode: (firestoreError as any)?.code,
        errorMessage: (firestoreError as any)?.message,
        step: 'FIRESTORE_WRITE_FAILED'
      });
      
      const errorResponse = NextResponse.json(
        { 
          error: 'Database operation failed', 
          details: firestoreError instanceof Error ? firestoreError.message : 'Unknown database error',
          correlationId
        },
        { status: 500 }
      );
      errorResponse.headers.set(CORRELATION_ID_HEADER, correlationId);
      logger.logRequest(context, startTime, 500, { 
        firestoreError: firestoreError instanceof Error ? firestoreError.message : String(firestoreError)
      });
      return errorResponse;
    }

  } catch (error) {
    logger.error(context, error instanceof Error ? error : new Error(String(error)), {
      correlationId,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      step: 'CRITICAL_ERROR'
    });
    
    const errorResponse = NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        correlationId
      },
      { status: 500 }
    );
    errorResponse.headers.set(CORRELATION_ID_HEADER, correlationId);
    
    logger.logRequest(context, startTime, 500, { 
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return errorResponse;
  }
}

// Export the performance-monitored version with enhanced configuration
export const POST = withPerformanceMonitoring(handlePOST, {
  enablePayloadTracking: true,
  slowRequestThreshold: 3000, // 3 seconds for database operations
  maxPayloadSizeToLog: 10000 // Increased for detailed logging
});