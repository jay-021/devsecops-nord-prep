/**
 * ZenType Admin Audit Logger
 * 
 * Centralized audit logging for all admin actions.
 * Based on enterprise best practices from Google Cloud Audit Logs and AWS CloudTrail.
 * 
 * @version 1.0
 * @created November 17, 2025
 */

import { db } from '@/lib/firebase-admin';
import {
  AdminAuditLogEntry,
  LogAdminActionParams,
  AuditChange,
} from '@/lib/types/audit';

// ============================================
// SENSITIVE FIELD DETECTION
// ============================================

const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'apiKey',
  'secretKey',
  'stripeSecretKey',
  'firebasePrivateKey',
  'token',
  'refreshToken',
  'accessToken',
  'privateKey',
];

/**
 * Check if field name contains sensitive data
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerFieldName = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(sensitive => lowerFieldName.includes(sensitive));
}

/**
 * Redact sensitive fields before logging
 */
function sanitizeChanges(changes: AuditChange[]): AuditChange[] {
  return changes.map(change => {
    if (isSensitiveField(change.field)) {
      return {
        field: change.field,
        oldValue: '[REDACTED]',
        newValue: '[REDACTED]',
      };
    }
    return change;
  });
}

// ============================================
// IP ADDRESS ANONYMIZATION (GDPR)
// ============================================

/**
 * Anonymize IP addresses for EU users (GDPR Article 6)
 * Example: 192.168.1.100 → 192.168.1.0
 */
function anonymizeIpAddress(ip: string, userRegion: string = 'UNKNOWN'): string {
  // For now, anonymize all IPs (can be refined with geo-location later)
  // This is the safest approach for GDPR compliance
  if (!ip) return 'unknown';
  
  const parts = ip.split('.');
  if (parts.length === 4) {
    parts[3] = '0'; // Mask last octet
    return parts.join('.');
  }
  
  // IPv6 anonymization: mask last 80 bits
  if (ip.includes(':')) {
    const ipv6Parts = ip.split(':');
    if (ipv6Parts.length >= 4) {
      return ipv6Parts.slice(0, 4).join(':') + '::';
    }
  }
  
  return ip; // Return as-is if format not recognized
}

// ============================================
// MAIN LOGGING FUNCTION
// ============================================

/**
 * Log admin action to audit trail
 * 
 * CRITICAL: Always call this BEFORE performing the action (not after)
 * This ensures audit log is created even if the action fails.
 * 
 * @param params - Structured logging parameters
 * @returns Document ID of created audit log entry
 * 
 * @example
 * ```typescript
 * await logAdminAction({
 *   adminUserId: 'abc123',
 *   adminEmail: 'admin@zentype.com',
 *   adminRole: 'superAdmin',
 *   actionType: AuditActionType.USER_PROFILE_UPDATED,
 *   actionCategory: AuditCategory.USER_MANAGEMENT,
 *   actionSeverity: AuditSeverity.NOTICE,
 *   actionDescription: 'Updated user profile',
 *   targetUserId: 'user456',
 *   targetUserEmail: 'user@example.com',
 *   changes: [{ field: 'displayName', oldValue: 'Old Name', newValue: 'New Name' }],
 *   success: true,
 * });
 * ```
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<string> {
  // Generate unique event ID
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  // Calculate retention expiry (7 years from now)
  const retentionExpiresAt = new Date(
    Date.now() + (7 * 365 * 24 * 60 * 60 * 1000)
  ).toISOString();
  
  // Sanitize changes (redact sensitive fields)
  const sanitizedChanges = params.changes ? sanitizeChanges(params.changes) : undefined;
  
  // Anonymize IP address (GDPR compliance)
  const anonymizedIp = params.ipAddress
    ? anonymizeIpAddress(params.ipAddress)
    : undefined;
  
  // Construct audit log entry
  const logEntry: AdminAuditLogEntry = {
    id: '', // Will be set by Firestore
    eventId,
    timestamp,
    
    actor: {
      userId: params.adminUserId,
      email: params.adminEmail,
      role: params.adminRole,
    },
    
    action: {
      type: params.actionType,
      category: params.actionCategory,
      severity: params.actionSeverity,
      description: params.actionDescription,
    },
    
    target: params.targetUserId ? {
      type: 'user' as const,
      userId: params.targetUserId,
      email: params.targetUserEmail,
      resourceId: params.targetResourceId,
      resourceType: params.targetResourceType,
    } : undefined,
    
    changes: sanitizedChanges,
    
    context: {
      ipAddress: anonymizedIp,
      userAgent: params.userAgent,
      reason: params.reason,
      apiEndpoint: params.apiEndpoint,
      correlationId: params.correlationId,
    },
    
    result: {
      success: params.success,
      error: params.error,
      errorCode: params.errorCode,
    },
    
    compliance: {
      dataClassification: 'internal' as const,
      gdprLegalBasis: 'legitimate_interest' as const,
      retentionExpiresAt,
    },
  };
  
  // Remove undefined fields (Firestore doesn't accept undefined values)
  const cleanedLogEntry = JSON.parse(JSON.stringify(logEntry));
  
  try {
    // Write to Firestore
    const docRef = await db.collection('adminAuditLog').add(cleanedLogEntry);
    
    // Update the id field with Firestore document ID
    await docRef.update({ id: docRef.id });
    
    console.log('[AuditLogger] Action logged', {
      eventId,
      actionType: params.actionType,
      severity: params.actionSeverity,
      adminEmail: params.adminEmail,
      targetUserEmail: params.targetUserEmail,
    });
    
    return docRef.id;
  } catch (error) {
    // CRITICAL: Logging must never fail silently
    console.error('[AuditLogger] FAILED TO LOG ACTION', {
      eventId,
      actionType: params.actionType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Fall back to console logging (last resort)
    console.error('[AuditLogger] Failed log entry:', JSON.stringify(logEntry, null, 2));
    
    // Throw error to prevent action from proceeding
    throw new Error('Audit logging failed - action aborted for compliance');
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract IP address from Next.js request
 * Handles various proxy headers (x-forwarded-for, x-real-ip, etc.)
 */
export function getIpAddress(request: Request | { headers: Headers }): string | undefined {
  const headers = request.headers;
  
  // Check common proxy headers
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
    // We want the first one (client IP)
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  const cfConnectingIp = headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return 'unknown';
}

/**
 * Extract user agent from Next.js request
 */
export function getUserAgent(request: Request | { headers: Headers }): string | undefined {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Generate correlation ID for request tracing
 * Format: cor_<timestamp>_<random>
 */
export function generateCorrelationId(): string {
  return `cor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create changes array from before/after objects
 * 
 * @example
 * ```typescript
 * const changes = createChanges(
 *   { tier: 'free', limit: 5 },
 *   { tier: 'premium', limit: 50 }
 * );
 * // Returns: [
 * //   { field: 'tier', oldValue: 'free', newValue: 'premium' },
 * //   { field: 'limit', oldValue: 5, newValue: 50 }
 * // ]
 * ```
 */
export function createChanges(
  oldObject: Record<string, any>,
  newObject: Record<string, any>
): AuditChange[] {
  const changes: AuditChange[] = [];
  
  // Get all unique keys from both objects
  const allKeys = new Set([
    ...Object.keys(oldObject),
    ...Object.keys(newObject),
  ]);
  
  for (const key of allKeys) {
    const oldValue = oldObject[key];
    const newValue = newObject[key];
    
    // Only log if value actually changed
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        oldValue,
        newValue,
      });
    }
  }
  
  return changes;
}

// ============================================
// EXPORTS
// ============================================

export {
  type AdminAuditLogEntry,
  type LogAdminActionParams,
  type AuditChange,
} from '@/lib/types/audit';

export {
  AuditActionType,
  AuditCategory,
  AuditSeverity,
} from '@/lib/types/audit';
