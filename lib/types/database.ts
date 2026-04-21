// lib/types/database.ts

import { Timestamp } from 'firebase/firestore';

// Collection Names
export const COLLECTIONS = {
  PROFILES: 'profiles',
  PRE_MADE_TESTS: 'preMadeTests', // Legacy name - actual collection is test_contents
  TEST_CONTENTS: 'test_contents', // Actual collection name in Firestore
  AI_GENERATED_TESTS: 'aiGeneratedTests',
  TEST_RESULTS: 'testResults', // This will be a subcollection under profiles
};

export interface UserProfile {
  uid: string;
  email: string | null;
  username: string;
  photoURL?: string;
  createdAt: string; // ISO String
  bio?: string; // User's short biography
  preferredThemeId?: string; // e.g., "neon-wave"
  preferredFontId?: string; // e.g., "fira-code"
  settings?: {
    keyboardSounds?: boolean;
    visualFeedback?: boolean;
    autoSaveAiTests?: boolean;
  };
  stats: {
    rank: string;
    testsCompleted: number;
    avgWpm: number;
    avgAcc: number;
    bestWpm?: number; // Best WPM achieved
  };
}

export interface PreMadeTest {
  id: string;
  text: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string; // e.g., 'technology', 'customer_support', 'business_finance'
  source: string; // e.g., 'Technology', 'Customer Support - VPN', 'Business & Finance'
  wordCount: number; // Number of words in the test (50, 100, 200, 500)
  timeLimit: number; // Recommended time in seconds (30, 60, 120, 300)
  createdAt: string; // ISO string timestamp
}

export interface TestResult {
  id: string; // Document ID for the test result
  textLength: number; // Length of the text that was typed
  userInput: string; // What the user actually typed
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number; // in seconds (renamed from duration)
  testType: string; // 'practice', 'ai-generated', etc.
  difficulty: string; // 'Easy', 'Medium', 'Hard'
  completedAt: string; // ISO string (renamed from timestamp)
}

export interface AiGeneratedTest extends PreMadeTest {
  // AI-specific fields, if any, can extend PreMadeTest
  generatedByAi: boolean;
}

// ============================================
// ADMIN PANEL & SUBSCRIPTION SYSTEM TYPES
// Added: November 17, 2025
// ============================================

/**
 * Firebase Custom Claims for RBAC
 * Applied to user's ID token via Firebase Admin SDK
 */
export interface AdminClaims {
  admin?: boolean; // Basic admin access (view dashboards, read-only operations)
  superAdmin?: boolean; // Full admin control (promote users, manage all resources)
  canDeleteUsers?: boolean; // Permission to delete user accounts
  canManageSubscriptions?: boolean; // Permission to modify subscription tiers
}

/**
 * Subscription Tier Types
 * Free: 5 AI tests per day, unlimited practice tests
 * Premium: Unlimited AI tests
 */
export type SubscriptionTier = 'free' | 'premium';

/**
 * User Subscription Document
 * Collection: subscriptions
 * Document ID: {userId}
 */
export interface Subscription {
  userId: string; // Firebase Auth UID
  tier: SubscriptionTier; // Current subscription tier
  status: 'active' | 'cancelled' | 'expired' | 'trial'; // Subscription status
  
  // AI Test Rate Limiting (Daily)
  aiTestsUsedToday: number; // Number of AI tests used today (resets daily)
  aiTestDailyLimit: number; // Daily limit (5 for free, -1 for premium = unlimited)
  aiTestResetDate: string; // ISO string - date when counter resets (midnight UTC)
  
  // Billing & Payments (Stripe Integration - Phase 3)
  stripeCustomerId?: string; // Stripe customer ID
  stripeSubscriptionId?: string; // Stripe subscription ID
  stripePriceId?: string; // Stripe price ID (monthly or yearly plan)
  
  // Subscription Dates
  startDate: string; // ISO string - when subscription started
  endDate?: string; // ISO string - when subscription ends (null for active recurring)
  cancelledAt?: string; // ISO string - when user cancelled (still active until endDate)
  
  // Timestamps
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * Admin Audit Log Entry
 * Collection: adminAuditLog
 * Document ID: auto-generated
 * 
 * GDPR Requirement: Complete audit trail for all admin actions
 */
export interface AdminAuditLogEntry {
  id: string; // Auto-generated document ID
  timestamp: string; // ISO string - when action occurred
  
  // Who performed the action
  adminUserId: string; // Firebase UID of admin user
  adminEmail: string; // Email of admin user (for human readability)
  adminRole: 'admin' | 'superAdmin'; // Admin's role at time of action
  
  // What action was performed
  action: 
    | 'user_created' 
    | 'user_updated' 
    | 'user_deleted' 
    | 'subscription_created' 
    | 'subscription_updated' 
    | 'subscription_cancelled'
    | 'role_granted' 
    | 'role_revoked' 
    | 'ai_test_limit_modified'
    | 'account_email_changed'
    | 'account_username_changed'
    | 'admin_login'
    | 'admin_logout';
  
  // Target of the action (if applicable)
  targetUserId?: string; // Firebase UID of affected user
  targetUserEmail?: string; // Email of affected user
  
  // What changed (structured data)
  changes?: {
    field: string; // e.g., 'subscription.tier', 'user.email'
    oldValue: string | number | boolean | null; // Previous value
    newValue: string | number | boolean | null; // New value
  }[];
  
  // Additional context
  metadata?: {
    ipAddress?: string; // IP address of admin (GDPR: legitimate interest for security)
    userAgent?: string; // Browser/device info
    reason?: string; // Admin-provided reason for action
  };
  
  // Success/Failure
  success: boolean; // Whether action succeeded
  error?: string; // Error message if action failed
}

/**
 * Admin User Settings (Optional - Phase 5)
 * Collection: adminUsers
 * Document ID: {userId}
 * 
 * Stores admin-specific preferences and settings
 */
export interface AdminUserSettings {
  userId: string; // Firebase Auth UID
  email: string;
  
  // Admin Preferences
  preferences?: {
    defaultUserListPageSize?: number; // Default rows per page (10, 25, 50, 100)
    dashboardLayout?: 'compact' | 'detailed'; // Dashboard view preference
    notificationsEnabled?: boolean; // Email notifications for critical events
  };
  
  // Timestamps
  createdAt: string; // ISO string - when admin role was first granted
  lastLoginAt?: string; // ISO string - last admin login
  updatedAt: string; // ISO string
}
