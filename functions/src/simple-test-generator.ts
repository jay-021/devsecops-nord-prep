/**
 * Simple Test Generator
 * Cloud Function for generating typing tests from user-provided text
 * 
 * This function:
 * - Takes user-provided text (50-5000 characters)
 * - Cleans and formats the text (no AI processing)
 * - Checks subscription limits (counts against daily AI tests)
 * - Saves to Firestore aiGeneratedTests collection
 * 
 * Unlike regular AI test generation, this is faster and has no API cost,
 * but still counts against the user's daily limit to prevent abuse.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { checkAiTestLimit } from './subscription-rate-limiter';

const db = getFirestore();

interface SimpleTestRequest {
  text: string;
}

export const generateSimpleTest = onCall(async (request) => {
  const userId = request.auth?.uid;
  
  // 1. Check authentication
  if (!userId) {
    console.warn('[Simple Test Generator] Unauthenticated request');
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { text } = request.data as SimpleTestRequest;
  
  console.log('[Simple Test Generator] Request received', {
    userId,
    textLength: text?.length || 0
  });
  
  // 2. Validate text input
  if (!text || typeof text !== 'string') {
    console.warn('[Simple Test Generator] Missing or invalid text', { userId });
    throw new HttpsError('invalid-argument', 'Text is required');
  }
  
  const trimmedText = text.trim();
  
  if (trimmedText.length < 50) {
    console.warn('[Simple Test Generator] Text too short', {
      userId,
      length: trimmedText.length
    });
    throw new HttpsError(
      'invalid-argument',
      'Text must be at least 50 characters long'
    );
  }
  
  if (trimmedText.length > 5000) {
    console.warn('[Simple Test Generator] Text too long', {
      userId,
      length: trimmedText.length
    });
    throw new HttpsError(
      'invalid-argument',
      'Text must be less than 5000 characters long'
    );
  }
  
  // 3. Check subscription limit (same as regular AI test generation)
  try {
    await checkAiTestLimit(userId);
    console.log('[Simple Test Generator] Subscription limit check passed', {
      userId
    });
  } catch (error) {
    console.warn('[Simple Test Generator] Subscription limit exceeded', {
      userId
    });
    throw error; // Re-throw the resource-exhausted error
  }
  
  // 4. Clean and format text
  // No AI processing - just basic cleaning and formatting
  const cleanedText = trimmedText
    .replace(/\s+/g, ' ')              // Normalize whitespace
    .replace(/[^\w\s.,!?'"-]/g, '')    // Remove special characters (keep basic punctuation)
    .trim();
  
  const wordCount = cleanedText.split(/\s+/).filter(word => word.length > 0).length;
  
  console.log('[Simple Test Generator] Text cleaned', {
    userId,
    originalLength: trimmedText.length,
    cleanedLength: cleanedText.length,
    wordCount
  });
  
  // 5. Save to Firestore
  try {
    const testRef = await db.collection('aiGeneratedTests').add({
      userId,
      text: cleanedText,
      prompt: 'User-provided text (simple mode)',
      difficulty: 'custom',
      category: 'custom',
      wordCount,
      createdAt: new Date().toISOString(),
      isPublic: false,
      mode: 'simple',
      // Metadata
      generatedBy: 'simpleTestGenerator',
      version: '1.0'
    });
    
    console.log('[Simple Test Generator] Test saved successfully', {
      userId,
      testId: testRef.id,
      wordCount
    });
    
    return {
      testId: testRef.id,
      text: cleanedText,
      wordCount,
      message: 'Simple test generated successfully'
    };
    
  } catch (error) {
    console.error('[Simple Test Generator] Failed to save test', {
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new HttpsError(
      'internal',
      'Failed to save test to database'
    );
  }
});
