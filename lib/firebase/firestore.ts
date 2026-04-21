// lib/firebase/firestore.ts

import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, query, where, orderBy, limit as limitToLast, getDocs } from 'firebase/firestore';
import { db } from './client';
import { UserProfile, TestResult, COLLECTIONS } from '@/lib/types/database';

/**
 * Creates a new user profile in Firestore (only if it doesn't exist)
 * @param uid - User's unique identifier
 * @param email - User's email address
 * @param username - User's chosen username
 * @param photoURL - Optional profile photo URL
 * @returns Promise<UserProfile> - Returns the created or existing profile
 */
export const createUserProfile = async (
  uid: string, 
  email: string | null, 
  username: string,
  photoURL?: string
): Promise<UserProfile> => {
  console.log('🔧 createUserProfile called with:', { uid, email, username, photoURL });
  
  try {
    // Check if profile already exists
    console.log('🔍 Checking for existing profile...');
    const existingProfile = await getUserProfile(uid);
    if (existingProfile) {
      console.log('✅ User profile already exists:', existingProfile);
      return existingProfile;
    }

    // Generate a default username if none provided
    const finalUsername = username || email?.split('@')[0] || `user_${uid.slice(0, 8)}`;
    console.log('📝 Final username will be:', finalUsername);

    const profileData: UserProfile = {
      uid,
      email,
      username: finalUsername,
      createdAt: new Date().toISOString(),
      bio: '',
      preferredThemeId: 'default',
      preferredFontId: 'fira-code',
      settings: {
        keyboardSounds: true,
        visualFeedback: true,
      },
      stats: {
        rank: 'E',
        testsCompleted: 0,
        avgWpm: 0,
        avgAcc: 0,
        bestWpm: 0,
      },
    };

    // Only add photoURL if it exists (Firestore doesn't accept undefined)
    if (photoURL) {
      profileData.photoURL = photoURL;
    }

    console.log('💾 Attempting to save profile data:', profileData);
    console.log('📍 Saving to collection path:', `${COLLECTIONS.PROFILES}/${uid}`);
    console.log('🔍 Profile data keys:', Object.keys(profileData));
    console.log('🔍 Profile data values that might be undefined:', {
      photoURL: profileData.photoURL,
      bio: profileData.bio,
      preferredThemeId: profileData.preferredThemeId,
      preferredFontId: profileData.preferredFontId
    });
    
    try {
      await setDoc(doc(db, COLLECTIONS.PROFILES, uid), profileData);
      console.log('✅ Profile setDoc completed successfully');
    } catch (setDocError) {
      console.error('💥 setDoc failed with error:', setDocError);
      console.error('💥 Failed profile data:', JSON.stringify(profileData, null, 2));
      throw setDocError;
    }
    
    // Wait a moment for Firestore to process
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify the profile was saved by reading it back
    console.log('🔍 Verifying profile was saved...');
    const savedProfile = await getUserProfile(uid);
    if (savedProfile) {
      console.log('✅ Profile verified in Firestore:', savedProfile);
      return savedProfile;
    } else {
      console.error('❌ Profile not found after creation - Firestore issue!');
      throw new Error('Profile creation verification failed');
    }
  } catch (error) {
    console.error('💥 Error in createUserProfile:', error);
    throw error;
  }
};

/**
 * Fetches a user profile from Firestore
 * @param uid - User's unique identifier
 * @returns Promise<UserProfile | null>
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  console.log('🔍 getUserProfile called for UID:', uid);
  
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, uid);
    console.log('📍 Fetching from collection path:', `${COLLECTIONS.PROFILES}/${uid}`);
    
    const profileSnap = await getDoc(profileRef);
    console.log('📄 Profile document snapshot:', { exists: profileSnap.exists(), id: profileSnap.id });
    
    if (profileSnap.exists()) {
      const profileData = profileSnap.data() as UserProfile;
      console.log('✅ Profile found:', profileData);
      return profileData;
    } else {
      console.log('❌ No profile document found for UID:', uid);
      return null;
    }
  } catch (error) {
    console.error('💥 Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Updates specific fields in a user's profile
 * @param uid - User's unique identifier
 * @param data - Partial UserProfile object with fields to update
 * @returns Promise<void>
 */
export const updateUserProfile = async (
  uid: string, 
  data: Partial<UserProfile>
): Promise<void> => {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, uid);
    await updateDoc(profileRef, data);
    console.log('User profile updated successfully for UID:', uid);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Deletes a user's profile from Firestore
 * @param uid - User's unique identifier
 * @returns Promise<void>
 */
export const deleteUserProfile = async (uid: string): Promise<void> => {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, uid);
    await deleteDoc(profileRef);
    console.log('User profile deleted successfully for UID:', uid);
  } catch (error) {
    console.error('Error deleting user profile:', error);
    throw error;
  }
};

/**
 * Repairs/updates an existing profile to ensure it has all required fields
 * @param uid - User's unique identifier
 * @param email - User's email address
 * @returns Promise<void>
 */
export const repairUserProfile = async (uid: string, email: string | null): Promise<void> => {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, uid);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      const existingData = profileSnap.data();
      const updates: Partial<UserProfile> = {};
      
      // Check for missing username and add one
      if (!existingData.username) {
        updates.username = email?.split('@')[0] || `user_${uid.slice(0, 8)}`;
      }
      
      // Check for missing settings
      if (!existingData.settings) {
        updates.settings = {
          keyboardSounds: true,
          visualFeedback: true,
        };
      }
      
      // Check for missing theme preferences
      if (!existingData.preferredThemeId) {
        updates.preferredThemeId = 'default';
      }
      
      if (!existingData.preferredFontId) {
        updates.preferredFontId = 'fira-code';
      }
      
      // Apply updates if any are needed
      if (Object.keys(updates).length > 0) {
        await updateDoc(profileRef, updates);
        console.log('Profile repaired for UID:', uid, 'with updates:', updates);
      }
    }
  } catch (error) {
    console.error('Error repairing user profile:', error);
  }
};

/**
 * Save a test result to Firestore
 * @param uid - User's unique identifier
 * @param testResult - Test result data (without id)
 * @returns Promise<string> - Returns the document ID
 */
export const saveTestResult = async (uid: string, testResult: Omit<TestResult, 'id' | 'completedAt'>) => {
  try {
    const testResultsRef = collection(db, COLLECTIONS.PROFILES, uid, 'testResults');
    const docRef = await addDoc(testResultsRef, {
      ...testResult,
      completedAt: new Date().toISOString(),
    });
    console.log('Test result saved with ID:', docRef.id);
    
    // Update user stats after saving test result
    await updateUserStatsAfterTest(uid);
    
    return docRef.id;
  } catch (error) {
    console.error('Error saving test result:', error);
    throw error;
  }
};

/**
 * Get user's test history
 * @param uid - User's unique identifier
 * @param limit - Number of tests to fetch
 * @returns Promise<TestResult[]>
 */
export const getUserTestHistory = async (uid: string, limitCount: number = 20) => {
  try {
    const testResultsRef = collection(db, COLLECTIONS.PROFILES, uid, 'testResults');
    const q = query(testResultsRef, orderBy('completedAt', 'desc'), limitToLast(limitCount));
    const querySnapshot = await getDocs(q);
    
    const testHistory: TestResult[] = [];
    querySnapshot.forEach((doc) => {
      testHistory.push({ id: doc.id, ...doc.data() } as TestResult);
    });
    
    console.log('Fetched test history:', testHistory.length, 'tests');
    return testHistory;
  } catch (error) {
    console.error('Error fetching test history:', error);
    return [];
  }
};

/**
 * Update user stats after completing a test
 * @param uid - User's unique identifier
 */
const updateUserStatsAfterTest = async (uid: string) => {
  try {
    const testHistory = await getUserTestHistory(uid, 100); // Get recent tests for calculation
    
    if (testHistory.length === 0) return;
    
    const testsCompleted = testHistory.length;
    const avgWpm = testHistory.reduce((sum, test) => sum + test.wpm, 0) / testsCompleted;
    const avgAcc = testHistory.reduce((sum, test) => sum + test.accuracy, 0) / testsCompleted;
    
    // Calculate rank based on average WPM
    let rank = 'E';
    if (avgWpm >= 80) rank = 'S';
    else if (avgWpm >= 60) rank = 'A';
    else if (avgWpm >= 40) rank = 'B';
    else if (avgWpm >= 20) rank = 'C';
    else if (avgWpm >= 10) rank = 'D';
    
    // Update user profile with new stats
    await updateUserProfile(uid, {
      stats: {
        rank,
        testsCompleted,
        avgWpm: Math.round(avgWpm),
        avgAcc: Math.round(avgAcc),
      }
    });
    
    console.log('User stats updated:', { rank, testsCompleted, avgWpm: Math.round(avgWpm), avgAcc: Math.round(avgAcc) });
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
};

/**
 * Calculates user statistics from their test results
 * @param uid - User's unique identifier
 * @returns Promise<UserStats | null>
 */
export const calculateUserStats = async (uid: string) => {
  try {
    console.log('📊 calculateUserStats called for UID:', uid);
    
    // Query test results directly from the testResults collection
    const testResultsRef = collection(db, 'testResults');
    const q = query(
      testResultsRef,
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const testResults = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
      };
    }) as any[];
    
    console.log('📊 Found test results:', testResults.length);
    
    if (testResults.length === 0) {
      return {
        rank: 'E',
        testsCompleted: 0,
        avgWpm: 0,
        avgAcc: 0,
        bestWpm: 0,
        bestAccuracy: 0,
      };
    }
    
    // Calculate statistics
    const testsCompleted = testResults.length;
    const avgWpm = testResults.reduce((sum, test) => sum + (test.wpm || 0), 0) / testsCompleted;
    const avgAcc = testResults.reduce((sum, test) => sum + (test.accuracy || 0), 0) / testsCompleted;
    const bestWpm = Math.max(...testResults.map(test => test.wpm || 0));
    const bestAccuracy = Math.max(...testResults.map(test => test.accuracy || 0));
    
    // Calculate rank based on average WPM
    let rank = 'E';
    if (avgWpm >= 80) rank = 'S';
    else if (avgWpm >= 60) rank = 'A';
    else if (avgWpm >= 40) rank = 'B';
    else if (avgWpm >= 20) rank = 'C';
    else if (avgWpm >= 10) rank = 'D';
    
    const stats = {
      rank,
      testsCompleted,
      avgWpm: Math.round(avgWpm),
      avgAcc: Math.round(avgAcc),
      bestWpm: Math.round(bestWpm),
      bestAccuracy: Math.round(bestAccuracy),
    };
    
    console.log('📊 Calculated stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return null;
  }
};
