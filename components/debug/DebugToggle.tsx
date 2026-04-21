"use client"

import React, { useState, useMemo, useCallback } from 'react';
import { useDebug } from '@/context/DebugProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bug, X, Download, Trash2, Eye, EyeOff, ChevronDown, ChevronRight, Filter, Search, AlertCircle, Info, AlertTriangle, Zap } from 'lucide-react';

export function DebugToggle() {
  const { 
    isDebugEnabled, 
    toggleDebug, 
    logs, 
    clearLogs, 
    exportLogs,
    getLogsByLevel,
    getLogsByCategory,
    selectiveMode,
    toggleSelectiveMode,
    targetedFunctions,
    addTargetFunction,
    removeTargetFunction,
    clearTargetFunctions
  } = useDebug();
  
  const [showPanel, setShowPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showOnlyImportant, setShowOnlyImportant] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState('');

  // Helper function to determine if a log is important
  const isImportantLog = useCallback((log: any) => {
    const importantCategories = ['AI_GENERATION', 'UI', 'PERFORMANCE', 'AUTH', 'API', 'SYSTEM', 'DEBUG_SYSTEM'];
    const importantLevels = ['error', 'critical', 'warn'];
    
    return importantCategories.includes(log.category) || importantLevels.includes(log.level);
  }, []);

  // Compute statistics and filtered logs (always call hooks in same order)
  const { filteredLogs, categories, logStats } = useMemo(() => {
    const allCategories = Array.from(new Set(logs.map(log => log.category))).sort();
    
    let filtered = logs;
    
    // Apply importance filter first if enabled
    if (showOnlyImportant) {
      filtered = filtered.filter(isImportantLog);
    }
    
    // Filter by category
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(log => log.category === selectedCategory);
    }
    
    // Filter by level
    if (selectedLevel !== 'ALL') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(term) ||
        log.category.toLowerCase().includes(term) ||
        (log.location && log.location.toLowerCase().includes(term))
      );
    }
    
    // Compute statistics
    const stats = {
      total: logs.length,
      critical: getLogsByLevel('critical').length,
      error: getLogsByLevel('error').length,
      warn: getLogsByLevel('warn').length,
      info: getLogsByLevel('info').length,
      debug: getLogsByLevel('debug').length
    };
    
    return {
      filteredLogs: filtered,
      categories: allCategories,
      logStats: stats
    };
  }, [logs, selectedCategory, selectedLevel, searchTerm, showOnlyImportant, getLogsByLevel, isImportantLog]);
  
  // Group logs by category for better organization
  const logsByCategory = useMemo(() => {
    const grouped = new Map<string, typeof filteredLogs>();
    filteredLogs.forEach(log => {
      if (!grouped.has(log.category)) {
        grouped.set(log.category, []);
      }
      grouped.get(log.category)!.push(log);
    });
    return grouped;
  }, [filteredLogs]);
  
  const errorCount = logStats.critical + logStats.error;
  const warnCount = logStats.warn;

  // Early return after all hooks are called
  if (!isDebugEnabled) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        <Button
          onClick={toggleDebug}
          size="sm"
          variant="outline"
          className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 shadow-lg"
        >
          <Bug className="h-4 w-4 mr-1" />
          Debug
        </Button>
      </div>
    );
  }
  
  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };
  
  const toggleCategoryCollapse = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {/* Toggle Button */}
      <div className="flex flex-col items-end gap-2">
        <Button
          onClick={() => setShowPanel(!showPanel)}
          size="sm"
          variant="outline"
          className="bg-green-800 border-green-600 text-green-300 hover:bg-green-700 shadow-lg relative"
        >
          <Bug className="h-4 w-4 mr-1" />
          Debug ON
          {logs.length > 0 && (
            <Badge variant="secondary" className="ml-2 bg-blue-600 text-white text-xs">
              {logs.length}
            </Badge>
          )}
          {errorCount > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">
              {errorCount} ERR
            </Badge>
          )}
        </Button>

        <Button
          onClick={toggleDebug}
          size="sm"
          variant="outline"
          className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 shadow-lg"
        >
          <EyeOff className="h-4 w-4" />
        </Button>
      </div>

      {/* Debug Panel */}
      {showPanel && (
        <div className="fixed bottom-20 right-4 w-[500px] h-[600px] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 p-3 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-green-400" />
              <span className="text-sm font-semibold text-white">Debug Panel</span>
              {(errorCount > 0 || warnCount > 0) && (
                <div className="flex gap-1">
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {errorCount} errors
                    </Badge>
                  )}
                  {warnCount > 0 && (
                    <Badge variant="secondary" className="text-xs bg-yellow-600">
                      {warnCount} warnings
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => {
                  const data = exportLogs();
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `zentype-debug-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white p-1"
                title="Download logs"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => setShowOnlyImportant(!showOnlyImportant)}
                size="sm"
                variant="ghost"
                className={showOnlyImportant 
                  ? "text-blue-400 hover:text-blue-300 p-1" 
                  : "text-gray-400 hover:text-white p-1"
                }
                title="Show only important logs"
              >
                <Filter className="h-3 w-3" />
              </Button>
              <Button
                onClick={clearLogs}
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white p-1"
                title="Clear logs"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => setShowPanel(false)}
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-gray-800/50 p-3 border-b border-gray-700 flex-shrink-0">
            <div className="grid grid-cols-4 gap-4 text-center mb-3">
              <div>
                <div className="text-lg font-semibold text-white">{filteredLogs.length}</div>
                <div className="text-xs text-gray-400">Total Logs</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-red-400">{logStats.critical + logStats.error}</div>
                <div className="text-xs text-gray-400">Errors</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-yellow-400">{logStats.warn}</div>
                <div className="text-xs text-gray-400">Warnings</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-400">{categories.length}</div>
                <div className="text-xs text-gray-400">Categories</div>
              </div>
            </div>
            {showOnlyImportant && (
              <div className="text-center">
                <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                  ★ Showing priority logs only
                </span>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-gray-800/50 p-2 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-3 w-3 text-gray-400" />
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
              >
                <option value="ALL">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select 
                value={selectedLevel} 
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
              >
                <option value="ALL">All Levels</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-3 w-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 flex-1"
              />
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-gray-800/30 px-3 py-2 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-400">Showing: {filteredLogs.length}/{logStats.total}</span>
              <div className="flex items-center gap-2">
                {logStats.critical > 0 && <span className="text-red-400">Critical: {logStats.critical}</span>}
                {logStats.error > 0 && <span className="text-red-300">Error: {logStats.error}</span>}
                {logStats.warn > 0 && <span className="text-yellow-400">Warn: {logStats.warn}</span>}
                {logStats.info > 0 && <span className="text-blue-400">Info: {logStats.info}</span>}
                {logStats.debug > 0 && <span className="text-gray-400">Debug: {logStats.debug}</span>}
              </div>
            </div>
          </div>

          {/* Selective Logging Controls */}
          <div className="bg-gray-800/50 p-3 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-purple-400" />
                <span className="text-xs font-medium text-white">Selective Logging</span>
                <Button
                  onClick={toggleSelectiveMode}
                  size="sm"
                  variant="ghost"
                  className={selectiveMode 
                    ? "text-purple-400 hover:text-purple-300 p-1 text-xs" 
                    : "text-gray-400 hover:text-white p-1 text-xs"
                  }
                >
                  {selectiveMode ? 'ON' : 'OFF'}
                </Button>
              </div>
              {targetedFunctions.size > 0 && (
                <Button
                  onClick={clearTargetFunctions}
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white p-1 text-xs"
                  title="Clear all targets"
                >
                  Clear All
                </Button>
              )}
            </div>
            
            {selectiveMode && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Function name..."
                    value={newFunctionName}
                    onChange={(e) => setNewFunctionName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newFunctionName.trim()) {
                        addTargetFunction(newFunctionName.trim());
                        setNewFunctionName('');
                      }
                    }}
                    className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 flex-1"
                  />
                  <Button
                    onClick={() => {
                      if (newFunctionName.trim()) {
                        addTargetFunction(newFunctionName.trim());
                        setNewFunctionName('');
                      }
                    }}
                    size="sm"
                    variant="outline"
                    className="text-xs px-2 py-1 h-auto"
                  >
                    Add
                  </Button>
                </div>
                
                {targetedFunctions.size > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Array.from(targetedFunctions).map(funcName => (
                      <Badge
                        key={funcName}
                        variant="secondary"
                        className="text-xs bg-purple-900/50 text-purple-300 cursor-pointer hover:bg-purple-800/50"
                        onClick={() => removeTargetFunction(funcName)}
                        title="Click to remove"
                      >
                        {funcName} ×
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="text-xs text-gray-400">
                  {targetedFunctions.size === 0 
                    ? "Add function names to monitor specific procedures only"
                    : `Monitoring ${targetedFunctions.size} function(s)`
                  }
                </div>
              </div>
            )}
          </div>

          {/* Logs List */}
          <div className="flex-1 overflow-y-auto p-2 text-xs">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                {logs.length === 0 
                  ? "No debug logs yet. Start using the app to see logs appear here."
                  : "No logs match the current filters."
                }
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from(logsByCategory.entries()).map(([category, categoryLogs]) => {
                  const isCollapsed = collapsedCategories.has(category);
                  const categoryErrorCount = categoryLogs.filter(log => log.level === 'error' || log.level === 'critical').length;
                  
                  return (
                    <div key={category} className="border border-gray-700 rounded">
                      {/* Category Header */}
                      <div 
                        className="bg-gray-800 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-750"
                        onClick={() => toggleCategoryCollapse(category)}
                      >
                        <div className="flex items-center gap-2">
                          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          <span className="font-medium text-white">{category}</span>
                          <Badge variant="secondary" className="bg-gray-600 text-white text-xs">
                            {categoryLogs.length}
                          </Badge>
                          {categoryErrorCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {categoryErrorCount} ERR
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Category Logs */}
                      {!isCollapsed && (
                        <div className="p-2 space-y-1">
                          {categoryLogs.slice(-20).reverse().map((log) => {
                            const isExpanded = expandedLogs.has(log.id);
                            
                            return (
                              <div
                                key={log.id}
                                className={`p-2 rounded border-l-2 ${getLogStyle(log.level)} cursor-pointer hover:bg-gray-800/30`}
                                onClick={() => toggleLogExpansion(log.id)}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${getBadgeStyle(log.level)}`}
                                    >
                                      {log.level.toUpperCase()}
                                    </Badge>
                                    {isImportantLog(log) && (
                                      <span className="text-xs px-1 py-0.5 rounded bg-blue-600 text-blue-100 font-medium">
                                        ★
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-gray-500 text-xs">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="text-white text-xs mb-1 pl-5">
                                  {log.message}
                                </div>
                                
                                {isExpanded && (
                                  <div className="pl-5 mt-2 space-y-1">
                                    {log.location && (
                                      <div className="text-gray-400 text-xs">
                                        📍 {log.location}
                                      </div>
                                    )}
                                    {log.data && (
                                      <div className="bg-gray-800 p-2 rounded text-xs">
                                        <div className="text-gray-400 mb-1">Data:</div>
                                        <pre className="text-green-300 overflow-x-auto whitespace-pre-wrap">
                                          {JSON.stringify(log.data, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getLogStyle(level: string): string {
  switch (level) {
    case 'critical':
      return 'bg-red-900/20 border-red-500';
    case 'error':
      return 'bg-red-900/10 border-red-600';
    case 'warn':
      return 'bg-yellow-900/10 border-yellow-600';
    case 'info':
      return 'bg-blue-900/10 border-blue-600';
    case 'debug':
      return 'bg-gray-800/50 border-gray-600';
    default:
      return 'bg-gray-800/50 border-gray-600';
  }
}

function getBadgeStyle(level: string): string {
  switch (level) {
    case 'critical':
      return 'bg-red-600 text-white';
    case 'error':
      return 'bg-red-500 text-white';
    case 'warn':
      return 'bg-yellow-500 text-black';
    case 'info':
      return 'bg-blue-500 text-white';
    case 'debug':
      return 'bg-gray-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}
