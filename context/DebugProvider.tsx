"use client"

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// Debug log levels
export type DebugLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

// Enhanced debug categories for comprehensive tracking
export type DebugCategory = 
  | 'AI_GENERATION'      // AI test generation flow
  | 'PRACTICE_TEST'      // Practice test flow
  | 'TEST_SUBMISSION'    // Test submission for both modes
  | 'CONSOLE_ERRORS'     // Console errors and warnings
  | 'DEBUG_SYSTEM'       // Debug utility operations
  | 'AUTH'               // Authentication operations
  | 'API'                // API requests and responses
  | 'FIREBASE'           // Firebase operations
  | 'UI'                 // User interface interactions
  | 'PERFORMANCE'        // Performance monitoring
  | 'SYSTEM'             // System-level operations
  | 'USER_INTERACTION'   // User clicks, inputs, etc.
  | 'RATE_LIMITING';     // Rate limiting operations and monitoring

// Debug log entry structure with enhanced metadata
export interface DebugLogEntry {
  id: string;
  timestamp: number;
  level: DebugLevel;
  category: DebugCategory | string;
  message: string;
  data?: any;
  location?: string;
  userId?: string;
  sessionId?: string;
  // Enhanced tracking fields
  flowId?: string;        // Track end-to-end flows
  parentLogId?: string;   // Link related logs
  duration?: number;      // For timing operations
  success?: boolean;      // Operation success status
  errorCode?: string;     // Specific error codes
  metadata?: {            // Additional context
    userAgent?: string;
    url?: string;
    component?: string;
    action?: string;
    testType?: 'ai' | 'practice';
    testId?: string;
    correlationId?: string;
  };
}

// Debug context interface with enhanced functionality
interface DebugContextType {
  isDebugEnabled: boolean;
  toggleDebug: () => void;
  logs: DebugLogEntry[];
  addLog: (level: DebugLevel, category: DebugCategory | string, message: string, data?: any, location?: string, metadata?: DebugLogEntry['metadata']) => void;
  clearLogs: () => void;
  exportLogs: (categoryFilter?: string) => string;
  getLogsByCategory: (category: string) => DebugLogEntry[];
  getLogsByLevel: (level: DebugLevel) => DebugLogEntry[];
  getLogsByFlow: (flowId: string) => DebugLogEntry[];
  sessionId: string;
  
  // Enhanced filtering and search
  searchLogs: (query: string, fuzzy?: boolean) => DebugLogEntry[];
  getLogStats: () => {
    total: number;
    byLevel: Record<DebugLevel, number>;
    byCategory: Record<string, number>;
    recentErrors: DebugLogEntry[];
  };
  
  // Flow tracking for end-to-end operations
  startFlow: (category: DebugCategory, description: string, metadata?: DebugLogEntry['metadata']) => string;
  endFlow: (flowId: string, success: boolean, result?: any) => void;
  addToFlow: (flowId: string, level: DebugLevel, message: string, data?: any, location?: string) => void;
  
  // Selective logging features
  selectiveMode: boolean;
  toggleSelectiveMode: () => void;
  targetedFunctions: Set<string>;
  addTargetFunction: (functionName: string) => void;
  removeTargetFunction: (functionName: string) => void;
  clearTargetFunctions: () => void;
  
  // Category management
  getAvailableCategories: () => string[];
  getCategoryStats: (category: string) => {
    total: number;
    errors: number;
    warnings: number;
    recent: DebugLogEntry[];
  };
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

interface DebugProviderProps {
  children: React.ReactNode;
}

export function DebugProvider({ children }: DebugProviderProps) {
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [targetedFunctions, setTargetedFunctions] = useState<Set<string>>(new Set());
  const [selectiveMode, setSelectiveMode] = useState(false);
  const sessionId = useRef(generateSessionId());
  const logIdCounter = useRef(0);
  const recentMessages = useRef(new Map<string, { count: number; lastSeen: number }>());

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);
  


  // Generate unique session ID
  function generateSessionId(): string {
    return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }



  // Load debug state from localStorage (only after mount)
  useEffect(() => {
    if (!isMounted) return;
    
    const savedDebugState = localStorage.getItem('zentype-debug-enabled');
    if (savedDebugState === 'true') {
      setIsDebugEnabled(true);
    }
  }, [isMounted]);

  // Smart filtering for noise reduction
  const shouldFilterMessage = useCallback((message: string, category: string): boolean => {
    // Filter out common React/Next.js noise and repetitive messages
    const noisePatterns = [
      /Session will expire soon/,
      /Component render time measured/,
      /Test page component mounted/,
      /Failed to fetch user preferences/,
      /Rendered more hooks than during the previous render/,
      /React has detected a change in the order of Hooks/,
      /Warning: validateDOMNesting/,
      /Warning: Each child in a list should have a unique "key" prop/,
      /Hydration failed because the initial UI/,
      /There was an error while hydrating/,
      /Text content does not match server-rendered HTML/,
      // Middleware and system noise patterns
      /"timestamp".*"correlationId".*"serviceName":"nextjs-api"/,
      /"functionName":"middleware"/,
      // Performance monitoring noise
      /Component render metrics/,
      /Performance monitoring/,
      /render time/i,
      /GET \/?\?ide_webview_request_time=/,
      /Fast Refresh had to perform a full reload/,
      /Compiled in \d+ms \(\d+ modules\)/,
      /✓ Compiled/,
      /⚠ Fast Refresh/,
      // Additional Next.js development noise
      /webpack-hmr/,
      /hot-reload/,
      /\[HMR\]/,
      /\[webpack\]/,
      // IDE and development server noise
      /ide_webview_request_time/,
      /localhost:\d+.*404/,
      /GET.*404 in \d+ms/,
      /GET.*200 in \d+ms/,
    ];

    // Check if message matches any noise pattern
    const isNoise = noisePatterns.some(pattern => pattern.test(message));
    
    // Aggressively filter repetitive performance and auth messages
    if (category === 'PERFORMANCE') {
      return true; // Filter ALL performance logs for now
    }
    
    if (category === 'AUTH' && message.includes('Session will expire')) {
      return true;
    }

    if (category === 'UI' && message.includes('Test page component mounted')) {
      return true; // Filter repetitive component mount messages
    }
    
    return isNoise;
  }, []);

  // Deduplication logic
  const isDuplicateMessage = useCallback((message: string): boolean => {
    const now = Date.now();
    const messageKey = message.substring(0, 100); // Use first 100 chars as key
    const recent = recentMessages.current.get(messageKey);
    
    if (recent) {
      // If same message within 5 seconds, increment count
      if (now - recent.lastSeen < 5000) {
        recent.count++;
        recent.lastSeen = now;
        // Suppress if more than 3 occurrences in 5 seconds
        return recent.count > 3;
      } else {
        // Reset if more than 5 seconds passed
        recentMessages.current.set(messageKey, { count: 1, lastSeen: now });
      }
    } else {
      recentMessages.current.set(messageKey, { count: 1, lastSeen: now });
    }
    
    return false;
  }, []);

  // Enhanced addLogEntry function with flow tracking and metadata
  const addLogEntry = useCallback((
    level: DebugLevel,
    category: DebugCategory | string,
    message: string,
    data?: any,
    location?: string,
    skipConsoleOutput?: boolean,
    metadata?: DebugLogEntry['metadata'],
    flowId?: string,
    parentLogId?: string
  ) => {
    if (!isDebugEnabled && !skipConsoleOutput) return;

    // Apply smart filtering to prevent noise
    if (shouldFilterMessage(message, category)) {
      return; // Skip filtered messages
    }

    // Generate unique log ID
    const logId = `log_${Date.now()}_${++logIdCounter.current}`;
    
    // Create enhanced log entry
    const logEntry: DebugLogEntry = {
      id: logId,
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      location,
      sessionId: sessionId.current,
      flowId,
      parentLogId,
      metadata: {
        ...metadata,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      }
    };

    // Add to logs if debug is enabled
    if (isDebugEnabled) {
      setLogs(prevLogs => {
        const newLogs = [...prevLogs, logEntry];
        // Keep only last 500 logs to prevent memory issues (reduced from 1000)
        return newLogs.slice(-500);
      });
    }

    // Console output with enhanced formatting
    if (!skipConsoleOutput) {
      const consoleMethod = level === 'critical' || level === 'error' ? 'error' 
                          : level === 'warn' ? 'warn'
                          : level === 'debug' ? 'debug'
                          : 'log';
      
      // Use original console methods to prevent infinite loop
      if (typeof window !== 'undefined' && (window as any).originalConsole) {
        const originalMethod = (window as any).originalConsole[consoleMethod];
        if (originalMethod && typeof originalMethod === 'function') {
          originalMethod(
            `🔍 [${category}] ${message}`,
            data ? data : '',
            location ? `@ ${location}` : '',
            flowId ? `Flow: ${flowId}` : ''
          );
        } else {
          // Fallback to regular console if original method is not available
          console[consoleMethod](
            `🔍 [${category}] ${message}`,
            data ? data : '',
            location ? `@ ${location}` : '',
            flowId ? `Flow: ${flowId}` : ''
          );
        }
      } else {
        // Fallback when originalConsole is not available
        console[consoleMethod](
          `🔍 [${category}] ${message}`,
          data ? data : '',
          location ? `@ ${location}` : '',
          flowId ? `Flow: ${flowId}` : ''
        );
      }
    }

    return logId;
  }, [isDebugEnabled, shouldFilterMessage]);

  // Toggle debug mode
  const toggleDebug = useCallback(() => {
    setIsDebugEnabled(prev => {
      const newState = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('zentype-debug-enabled', newState.toString());
      }
      
      // Clear logs when disabling debug mode
      if (!newState) {
        setLogs([]);
      }
      
      // Log the toggle action
      if (newState) {
        addLogEntry('info', 'DEBUG_SYSTEM', 'Debug mode enabled', { sessionId: sessionId.current });
      }
      
      return newState;
    });
  }, [addLogEntry]);

  // Intercept console errors to filter noise (separate effect)
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;
    
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;
    const originalConsoleDebug = console.debug;
    
    // Store original console methods globally to prevent infinite loop
    (window as any).originalConsole = {
      error: originalConsoleError,
      warn: originalConsoleWarn,
      log: originalConsoleLog,
      debug: originalConsoleDebug
    };
    
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Only add to our debug logs if it's not filtered noise
      if (isDebugEnabled && !shouldFilterMessage(message, 'CONSOLE_ERRORS')) {
        addLogEntry('error', 'CONSOLE_ERRORS', message, { args }, undefined, true);
      }
      
      // Still call original console.error for development
      originalConsoleError.apply(console, args);
    };
    
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      
      // Only add to our debug logs if it's not filtered noise
      if (isDebugEnabled && !shouldFilterMessage(message, 'CONSOLE_ERRORS')) {
        addLogEntry('warn', 'CONSOLE_ERRORS', message, { args }, undefined, true);
      }
      
      // Still call original console.warn for development
      originalConsoleWarn.apply(console, args);
    };
    
    // Cleanup function to restore original console methods
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
      console.debug = originalConsoleDebug;
      delete (window as any).originalConsole;
    };
  }, [isMounted, isDebugEnabled, shouldFilterMessage, addLogEntry]);

  // Enhanced public add log function with metadata support
  const addLog = useCallback((
    level: DebugLevel,
    category: DebugCategory | string,
    message: string,
    data?: any,
    location?: string,
    metadata?: DebugLogEntry['metadata']
  ) => {
    addLogEntry(level, category, message, data, location, false, metadata);
  }, [addLogEntry]);

  // Enhanced export logs with category filtering
  const exportLogs = useCallback((categoryFilter?: string) => {
    let logsToExport = logs;
    
    if (categoryFilter && categoryFilter !== 'ALL') {
      logsToExport = logs.filter(log => 
        log.category.toLowerCase().includes(categoryFilter.toLowerCase())
      );
    }
    
    const exportData = {
      sessionId: sessionId.current,
      exportedAt: new Date().toISOString(),
      debugEnabled: isDebugEnabled,
      categoryFilter: categoryFilter || 'ALL',
      totalLogs: logs.length,
      filteredLogs: logsToExport.length,
      logs: logsToExport
    };
    return JSON.stringify(exportData, null, 2);
  }, [logs, isDebugEnabled]);

  // Get logs by flow ID
  const getLogsByFlow = useCallback((flowId: string) => {
    return logs.filter(log => log.flowId === flowId);
  }, [logs]);

  // Enhanced search with fuzzy matching
  const searchLogs = useCallback((query: string, fuzzy: boolean = false) => {
    if (!query.trim()) return logs;
    
    const searchTerm = query.toLowerCase();
    
    return logs.filter(log => {
      const searchableText = [
        log.message,
        log.category,
        log.location || '',
        JSON.stringify(log.data || {}),
        log.metadata?.component || '',
        log.metadata?.action || ''
      ].join(' ').toLowerCase();
      
      if (fuzzy) {
        // Simple fuzzy matching - check if all characters of query exist in order
        let queryIndex = 0;
        for (let i = 0; i < searchableText.length && queryIndex < searchTerm.length; i++) {
          if (searchableText[i] === searchTerm[queryIndex]) {
            queryIndex++;
          }
        }
        return queryIndex === searchTerm.length;
      } else {
        return searchableText.includes(searchTerm);
      }
    });
  }, [logs]);

  // Get comprehensive log statistics
  const getLogStats = useCallback(() => {
    const byLevel: Record<DebugLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0
    };
    
    const byCategory: Record<string, number> = {};
    
    logs.forEach(log => {
      byLevel[log.level]++;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });
    
    const recentErrors = logs
      .filter(log => log.level === 'error' || log.level === 'critical')
      .slice(-10)
      .reverse();
    
    return {
      total: logs.length,
      byLevel,
      byCategory,
      recentErrors
    };
  }, [logs]);

  // Flow tracking functions
  const startFlow = useCallback((
    category: DebugCategory,
    description: string,
    metadata?: DebugLogEntry['metadata']
  ) => {
    const flowId = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    addLogEntry(
      'info',
      category,
      `🚀 Flow started: ${description}`,
      { flowStart: true },
      undefined,
      false,
      metadata,
      flowId
    );
    
    return flowId;
  }, [addLogEntry]);

  const endFlow = useCallback((flowId: string, success: boolean, result?: any) => {
    const flowLogs = getLogsByFlow(flowId);
    const startLog = flowLogs.find(log => log.data?.flowStart);
    
    if (startLog) {
      const duration = Date.now() - startLog.timestamp;
      
      addLogEntry(
        success ? 'info' : 'error',
        startLog.category,
        `${success ? '✅' : '❌'} Flow completed: ${success ? 'Success' : 'Failed'}`,
        { 
          flowEnd: true, 
          duration,
          success,
          result,
          totalSteps: flowLogs.length
        },
        undefined,
        false,
        { ...startLog.metadata },
        flowId
      );
    }
  }, [addLogEntry, getLogsByFlow]);

  const addToFlow = useCallback((
    flowId: string,
    level: DebugLevel,
    message: string,
    data?: any,
    location?: string
  ) => {
    const flowLogs = getLogsByFlow(flowId);
    const startLog = flowLogs.find(log => log.data?.flowStart);
    
    addLogEntry(
      level,
      startLog?.category || 'SYSTEM',
      message,
      data,
      location,
      false,
      startLog?.metadata,
      flowId
    );
  }, [addLogEntry, getLogsByFlow]);

  // Get available categories
  const getAvailableCategories = useCallback(() => {
    const categories = new Set(logs.map(log => log.category));
    return Array.from(categories).sort();
  }, [logs]);

  // Get category statistics
  const getCategoryStats = useCallback((category: string) => {
    const categoryLogs = logs.filter(log => log.category === category);
    const errors = categoryLogs.filter(log => log.level === 'error' || log.level === 'critical').length;
    const warnings = categoryLogs.filter(log => log.level === 'warn').length;
    const recent = categoryLogs.slice(-5).reverse();
    
    return {
      total: categoryLogs.length,
      errors,
      warnings,
      recent
    };
  }, [logs]);

  // Get logs by category
  const getLogsByCategory = useCallback((category: string) => {
    return logs.filter(log => log.category === category);
  }, [logs]);

  // Get logs by level
  const getLogsByLevel = useCallback((level: DebugLevel) => {
    return logs.filter(log => log.level === level);
  }, [logs]);

  // Selective logging controls
  const toggleSelectiveMode = useCallback(() => {
    setSelectiveMode(prev => {
      const newMode = !prev;
      addLogEntry('info', 'DEBUG_SYSTEM', `Selective mode ${newMode ? 'enabled' : 'disabled'}`, {
        targetedFunctions: Array.from(targetedFunctions),
        functionsCount: targetedFunctions.size
      });
      return newMode;
    });
  }, [targetedFunctions, addLogEntry]);

  const addTargetFunction = useCallback((functionName: string) => {
    setTargetedFunctions(prev => {
      const newSet = new Set(prev);
      newSet.add(functionName);
      addLogEntry('info', 'DEBUG_SYSTEM', `Added target function: ${functionName}`, {
        totalTargets: newSet.size,
        allTargets: Array.from(newSet)
      });
      return newSet;
    });
  }, [addLogEntry]);

  const removeTargetFunction = useCallback((functionName: string) => {
    setTargetedFunctions(prev => {
      const newSet = new Set(prev);
      newSet.delete(functionName);
      addLogEntry('info', 'DEBUG_SYSTEM', `Removed target function: ${functionName}`, {
        totalTargets: newSet.size,
        allTargets: Array.from(newSet)
      });
      return newSet;
    });
  }, [addLogEntry]);

  const clearTargetFunctions = useCallback(() => {
    const count = targetedFunctions.size;
    setTargetedFunctions(new Set());
    addLogEntry('info', 'DEBUG_SYSTEM', `Cleared all target functions`, {
      clearedCount: count
    });
  }, [targetedFunctions.size, addLogEntry]);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    addLogEntry('info', 'DEBUG_SYSTEM', 'Logs cleared', { clearedAt: new Date().toISOString() });
  }, [addLogEntry]);

  const contextValue: DebugContextType = {
    isDebugEnabled,
    toggleDebug,
    logs,
    addLog,
    clearLogs,
    exportLogs,
    getLogsByCategory,
    getLogsByLevel,
    getLogsByFlow,
    sessionId: sessionId.current,
    
    // Enhanced filtering and search
    searchLogs,
    getLogStats,
    
    // Flow tracking
    startFlow,
    endFlow,
    addToFlow,
    
    // Selective logging
    selectiveMode,
    toggleSelectiveMode,
    targetedFunctions,
    addTargetFunction,
    removeTargetFunction,
    clearTargetFunctions,
    
    // Category management
    getAvailableCategories,
    getCategoryStats,
  };

  return (
    <DebugContext.Provider value={contextValue}>
      {children}
    </DebugContext.Provider>
  );
}

// Hook to use debug context
export function useDebug(): DebugContextType {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}

// Enhanced convenience hooks for different log levels with metadata support
export function useDebugLogger() {
  const { addLog, isDebugEnabled, startFlow, endFlow, addToFlow } = useDebug();
  
  return {
    isDebugEnabled,
    
    // Basic logging functions with metadata support
    debug: (category: DebugCategory | string, message: string, data?: any, location?: string, metadata?: DebugLogEntry['metadata']) => 
      addLog('debug', category, message, data, location, metadata),
    info: (category: DebugCategory | string, message: string, data?: any, location?: string, metadata?: DebugLogEntry['metadata']) => 
      addLog('info', category, message, data, location, metadata),
    warn: (category: DebugCategory | string, message: string, data?: any, location?: string, metadata?: DebugLogEntry['metadata']) => 
      addLog('warn', category, message, data, location, metadata),
    error: (category: DebugCategory | string, message: string, data?: any, location?: string, metadata?: DebugLogEntry['metadata']) => 
      addLog('error', category, message, data, location, metadata),
    critical: (category: DebugCategory | string, message: string, data?: any, location?: string, metadata?: DebugLogEntry['metadata']) => 
      addLog('critical', category, message, data, location, metadata),
    
    // Flow tracking helpers
    startFlow: (category: DebugCategory, description: string, metadata?: DebugLogEntry['metadata']) => 
      startFlow(category, description, metadata),
    endFlow: (flowId: string, success: boolean, result?: any) => 
      endFlow(flowId, success, result),
    addToFlow: (flowId: string, level: DebugLevel, message: string, data?: any, location?: string) => 
      addToFlow(flowId, level, message, data, location),
    
    // Specialized logging for common scenarios
    logUserInteraction: (action: string, component: string, data?: any) => 
      addLog('info', 'USER_INTERACTION', `User ${action}`, data, undefined, {
        component,
        action
      }),
    
    logApiCall: (method: string, endpoint: string, data?: any, success?: boolean) => 
      addLog(success === false ? 'error' : 'info', 'API', `${method} ${endpoint}`, data, undefined, {
        action: 'api_call'
      }),
    
    logFirebaseOperation: (operation: string, collection: string, data?: any, success?: boolean) => 
      addLog(success === false ? 'error' : 'info', 'FIREBASE', `${operation} ${collection}`, data, undefined, {
        action: 'firebase_operation'
      }),
    
    logTestFlow: (testType: 'ai' | 'practice', action: string, testId?: string, data?: any) => 
      addLog('info', testType === 'ai' ? 'AI_GENERATION' : 'PRACTICE_TEST', action, data, undefined, {
        testType,
        testId,
        action
      }),
    
    // Enhanced debugging helpers
    stateChange: (category: string, stateName: string, oldValue: any, newValue: any, location?: string) => {
      addLog('debug', category, `State Change: ${stateName}`, {
        stateName,
        oldValue: typeof oldValue === 'string' && oldValue.length > 100 
          ? `${oldValue.substring(0, 100)}... [truncated ${oldValue.length} chars]`
          : oldValue,
        newValue: typeof newValue === 'string' && newValue.length > 100 
          ? `${newValue.substring(0, 100)}... [truncated ${newValue.length} chars]`
          : newValue,
        oldType: typeof oldValue,
        newType: typeof newValue,
        changed: oldValue !== newValue
      }, location);
    },
    
    textContent: (category: string, name: string, text: string, location?: string) => {
      addLog('debug', category, `Text Content: ${name}`, {
        contentName: name,
        textLength: text?.length || 0,
        wordCount: text ? text.split(' ').length : 0,
        firstWords: text ? text.substring(0, 100) + (text.length > 100 ? '...' : '') : '',
        lastWords: text && text.length > 100 ? '...' + text.substring(text.length - 50) : '',
        isEmpty: !text || text.trim().length === 0
      }, location);
    },
    
    functionFlow: (category: string, functionName: string, action: 'enter' | 'exit' | 'checkpoint', data?: any, location?: string) => {
      addLog('debug', category, `Function ${action.toUpperCase()}: ${functionName}`, {
        functionName,
        action,
        timestamp: Date.now(),
        ...data
      }, location);
    }
  };
}
