'use client';

import { useEffect, useState } from 'react';
import { 
  generateCorrelationId, 
  getCorrelationIdFromStorage, 
  setCorrelationIdInStorage,
  CORRELATION_ID_HEADER 
} from '@/lib/correlation-id';

/**
 * Custom hook for managing correlation IDs on the client side
 * Generates and persists correlation IDs in sessionStorage
 */
export function useCorrelationId() {
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    // Try to get existing correlation ID from storage
    let existingId = getCorrelationIdFromStorage();
    
    // If no existing ID or invalid, generate a new one
    if (!existingId) {
      existingId = generateCorrelationId();
      setCorrelationIdInStorage(existingId);
      console.log(`🆔 Generated new correlation ID: ${existingId}`);
    } else {
      console.log(`🆔 Using existing correlation ID: ${existingId}`);
    }
    
    setCorrelationId(existingId);
    setIsLoading(false);
  }, []);

  /**
   * Get headers object with correlation ID for API requests
   */
  const getHeaders = (additionalHeaders: Record<string, string> = {}) => {
    if (!correlationId) {
      return additionalHeaders;
    }
    
    return {
      [CORRELATION_ID_HEADER]: correlationId,
      ...additionalHeaders
    };
  };

  /**
   * Generate a new correlation ID and update storage
   * Useful for starting a new session or after errors
   */
  const refreshCorrelationId = () => {
    const newId = generateCorrelationId();
    setCorrelationIdInStorage(newId);
    setCorrelationId(newId);
    console.log(`🔄 Refreshed correlation ID: ${newId}`);
    return newId;
  };

  return {
    correlationId,
    isLoading,
    getHeaders,
    refreshCorrelationId
  };
}