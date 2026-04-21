/**
 * ZenType Admin Audit Logging Types
 * 
 * Enterprise-grade audit logging system based on:
 * - Google Cloud Audit Logs
 * - AWS CloudTrail
 * - Stripe Audit Log
 * 
 * @version 1.0
 * @created November 17, 2025
 */

// ============================================
// ACTION TYPES
// ============================================

/**
 * All possible admin actions to be logged
 * Organized by category for better querying
 */
export enum AuditActionType {
  // ============================================
  // AUTHENTICATION & SESSION MANAGEMENT
  // ============================================
  ADMIN_LOGIN = 'admin_login',
  ADMIN_LOGOUT = 'admin_logout',
  ADMIN_SESSION_EXPIRED = 'admin_session_expired',
  ADMIN_PASSWORD_RESET = 'admin_password_reset',
  ADMIN_2FA_ENABLED = 'admin_2fa_enabled',
  ADMIN_2FA_DISABLED = 'admin_2fa_disabled',
  
  // ============================================
  // USER MANAGEMENT
  // ============================================
  USER_VIEWED = 'user_viewed',
  USER_LIST_ACCESSED = 'user_list_accessed',
  USER_SEARCHED = 'user_searched',
  USER_PROFILE_UPDATED = 'user_profile_updated',
  USER_EMAIL_CHANGED = 'user_email_changed',
  USER_USERNAME_CHANGED = 'user_username_changed',
  USER_PASSWORD_RESET = 'user_password_reset',
  USER_ACCOUNT_DELETED = 'user_account_deleted',
  
  // ============================================
  // ROLE & PERMISSION MANAGEMENT
  // ============================================
  ROLE_GRANTED = 'role_granted',
  ROLE_REVOKED = 'role_revoked',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  
  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================
  SUBSCRIPTION_TIER_CHANGED = 'subscription_tier_changed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_LIMIT_MODIFIED = 'subscription_limit_modified',
  SUBSCRIPTION_RESET = 'subscription_reset',
  
  // ============================================
  // ACCOUNT STATUS MANAGEMENT
  // ============================================
  ACCOUNT_SUSPENDED = 'account_suspended',
  ACCOUNT_UNSUSPENDED = 'account_unsuspended',
  ACCOUNT_VERIFIED = 'account_verified',
  ACCOUNT_FLAGGED = 'account_flagged',
  ACCOUNT_UNFLAGGED = 'account_unflagged',
  
  // ============================================
  // DATA EXPORT & PRIVACY (GDPR)
  // ============================================
  USER_DATA_EXPORTED = 'user_data_exported',
  USER_DATA_DELETED = 'user_data_deleted',
  CONSENT_UPDATED = 'consent_updated',
  
  // ============================================
  // TEST MANAGEMENT
  // ============================================
  TEST_DELETED = 'test_deleted',
  TEST_FLAGGED = 'test_flagged',
  AI_TEST_GENERATED_ADMIN = 'ai_test_generated_admin',
  
  // ============================================
  // SYSTEM CONFIGURATION
  // ============================================
  SYSTEM_SETTINGS_UPDATED = 'system_settings_updated',
  FEATURE_FLAG_TOGGLED = 'feature_flag_toggled',
  RATE_LIMIT_ADJUSTED = 'rate_limit_adjusted',
  
  // ============================================
  // SECURITY EVENTS
  // ============================================
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',
  SUSPICIOUS_ACTIVITY_DETECTED = 'suspicious_activity_detected',
  SECURITY_ALERT_ACKNOWLEDGED = 'security_alert_acknowledged',
}

/**
 * Action Categories for Filtering
 */
export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  USER_MANAGEMENT = 'user_management',
  PERMISSIONS = 'permissions',
  SUBSCRIPTION = 'subscription',
  DATA_PRIVACY = 'data_privacy',
  SECURITY = 'security',
  SYSTEM_CONFIG = 'system_config',
}

/**
 * Severity Levels (Google Cloud-style)
 */
export enum AuditSeverity {
  INFO = 'INFO',           // Normal operations (login, view)
  NOTICE = 'NOTICE',       // Significant but expected (profile update)
  WARNING = 'WARNING',     // Unexpected but not dangerous (failed login)
  ERROR = 'ERROR',         // Operation failed (API error)
  CRITICAL = 'CRITICAL',   // High-risk action (account deletion, role change)
  ALERT = 'ALERT',         // Security incident (unauthorized access)
  EMERGENCY = 'EMERGENCY', // System-wide emergency (data breach)
}

// ============================================
// AUDIT LOG ENTRY STRUCTURE
// ============================================

/**
 * Actor (who performed the action)
 */
export interface AuditActor {
  userId: string;               // Firebase Auth UID of admin
  email: string;                // Admin's email address
  role: 'admin' | 'superAdmin'; // Admin's role at time of action
  sessionId?: string;           // Optional: Session identifier
}

/**
 * Action (what happened)
 */
export interface AuditAction {
  type: AuditActionType;        // Action type enum
  category: AuditCategory;      // Group actions by type
  severity: AuditSeverity;      // Risk level of action
  description: string;          // Human-readable description
}

/**
 * Target (what was affected)
 */
export interface AuditTarget {
  type: 'user' | 'subscription' | 'system' | 'test' | 'settings';
  userId?: string;              // Target user's Firebase UID
  email?: string;               // Target user's email
  resourceId?: string;          // Generic resource identifier
  resourceType?: string;        // Type of resource affected
}

/**
 * Change record (before/after)
 */
export interface AuditChange {
  field: string;                // Dot-notation path: "subscription.tier"
  oldValue: any;                // Previous value (JSON serializable)
  newValue: any;                // New value (JSON serializable)
}

/**
 * Context (metadata)
 */
export interface AuditContext {
  ipAddress?: string;           // Admin's IP address (anonymized in EU)
  userAgent?: string;           // Browser/device info
  reason?: string;              // Admin-provided reason for action
  apiEndpoint?: string;         // API route that handled request
  correlationId?: string;       // Request correlation ID
}

/**
 * Result (success/failure)
 */
export interface AuditResult {
  success: boolean;             // Whether action succeeded
  error?: string;               // Error message if failed
  errorCode?: string;           // Error code for categorization
}

/**
 * Compliance (GDPR/audit requirements)
 */
export interface AuditCompliance {
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  gdprLegalBasis: 'legitimate_interest' | 'legal_obligation' | 'consent';
  retentionExpiresAt: string;   // ISO 8601 - when log can be deleted
}

/**
 * Complete Admin Audit Log Entry (Enhanced)
 * Collection: adminAuditLog
 * Retention: 7 years (GDPR Article 30 requirement)
 */
export interface AdminAuditLogEntry {
  // Core identifiers
  id: string;                     // Auto-generated Firestore document ID
  timestamp: string;              // ISO 8601 format (UTC)
  eventId: string;                // Unique event ID: "evt_" + timestamp + random
  
  // Actor (who did it)
  actor: AuditActor;
  
  // Action (what happened)
  action: AuditAction;
  
  // Target (what was affected)
  target?: AuditTarget;
  
  // Changes (before/after)
  changes?: AuditChange[];
  
  // Context (metadata)
  context: AuditContext;
  
  // Result (success/failure)
  result: AuditResult;
  
  // Compliance (GDPR/audit requirements)
  compliance: AuditCompliance;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Parameters for logAdminAction function
 */
export interface LogAdminActionParams {
  // Actor
  adminUserId: string;
  adminEmail: string;
  adminRole: 'admin' | 'superAdmin';
  
  // Action
  actionType: AuditActionType;
  actionCategory: AuditCategory;
  actionSeverity: AuditSeverity;
  actionDescription: string;
  
  // Target (optional)
  targetUserId?: string;
  targetUserEmail?: string;
  targetResourceId?: string;
  targetResourceType?: string;
  
  // Changes (optional)
  changes?: AuditChange[];
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  apiEndpoint?: string;
  correlationId?: string;
  
  // Result
  success: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Query parameters for audit log API
 */
export interface AuditLogQueryParams {
  page?: number;                // Page number (1-indexed)
  limit?: number;               // Results per page (default: 50, max: 100)
  startDate?: string;           // ISO 8601 start date
  endDate?: string;             // ISO 8601 end date
  adminEmail?: string;          // Filter by admin email
  actionType?: AuditActionType; // Filter by action type
  actionCategory?: AuditCategory; // Filter by category
  severity?: AuditSeverity;     // Filter by severity
  targetUserEmail?: string;     // Filter by target user email
  successOnly?: boolean;        // Only successful actions
  failedOnly?: boolean;         // Only failed actions
}

/**
 * Audit log API response
 */
export interface AuditLogResponse {
  logs: AdminAuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
