/**
 * Correlation ID utilities for request tracing across the ZenType application.
 * Implements the format: req-{timestamp}-{random}
 */

/**
 * Generates a unique correlation ID with the format: req-{timestamp}-{random}
 * @returns A correlation ID string
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15); // 13 character random string
  return `req-${timestamp}-${random}`;
}

/**
 * Validates if a string is a properly formatted correlation ID
 * @param correlationId - The string to validate
 * @returns True if the correlation ID is valid, false otherwise
 */
export function isValidCorrelationId(correlationId: string): boolean {
  if (!correlationId || typeof correlationId !== 'string') {
    return false;
  }

  // Check format: req-{timestamp}-{random}
  const pattern = /^req-\d{13}-[a-z0-9]{13}$/;
  return pattern.test(correlationId);
}

/**
 * Extracts the timestamp from a correlation ID
 * @param correlationId - The correlation ID to extract timestamp from
 * @returns The timestamp as a number, or null if invalid
 */
export function extractTimestamp(correlationId: string): number | null {
  if (!isValidCorrelationId(correlationId)) {
    return null;
  }

  const parts = correlationId.split('-');
  if (parts.length !== 3) {
    return null;
  }

  const timestamp = parseInt(parts[1], 10);
  return isNaN(timestamp) ? null : timestamp;
}

/**
 * Gets or generates a correlation ID from sessionStorage
 * This function is for client-side use only
 * @returns The correlation ID from sessionStorage or a newly generated one
 */
export function getOrGenerateCorrelationId(): string {
  if (typeof window === 'undefined') {
    // Server-side: generate a new ID
    return generateCorrelationId();
  }

  const STORAGE_KEY = 'zentype-correlation-id';
  
  try {
    const existingId = sessionStorage.getItem(STORAGE_KEY);
    
    if (existingId && isValidCorrelationId(existingId)) {
      return existingId;
    }
    
    // Generate new ID and store it
    const newId = generateCorrelationId();
    sessionStorage.setItem(STORAGE_KEY, newId);
    return newId;
  } catch (error) {
    // Fallback if sessionStorage is not available
    console.warn('SessionStorage not available, generating correlation ID without persistence:', error);
    return generateCorrelationId();
  }
}

/**
 * Clears the correlation ID from sessionStorage
 * This function is for client-side use only
 */
export function clearCorrelationId(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const STORAGE_KEY = 'zentype-correlation-id';
  
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear correlation ID from sessionStorage:', error);
  }
}

/**
 * Gets correlation ID from sessionStorage
 * @returns The correlation ID from storage or null if not found/invalid
 */
export function getCorrelationIdFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const existingId = sessionStorage.getItem(CORRELATION_ID_STORAGE_KEY);
    return existingId && isValidCorrelationId(existingId) ? existingId : null;
  } catch (error) {
    console.warn('Failed to get correlation ID from sessionStorage:', error);
    return null;
  }
}

/**
 * Sets correlation ID in sessionStorage
 * @param correlationId - The correlation ID to store
 */
export function setCorrelationIdInStorage(correlationId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(CORRELATION_ID_STORAGE_KEY, correlationId);
  } catch (error) {
    console.warn('Failed to set correlation ID in sessionStorage:', error);
  }
}

/**
 * Constants for correlation ID handling
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const CORRELATION_ID_STORAGE_KEY = 'zentype-correlation-id';