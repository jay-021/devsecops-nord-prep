"use client"

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDebug } from '@/context/DebugProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Bug, X, Download, Trash2, Eye, EyeOff, ChevronDown, ChevronRight, 
  Filter, Search, AlertCircle, Info, AlertTriangle, Zap, Clock,
  Database, Globe, User, Settings, TestTube, Brain, Play, Send,
  BarChart3, FileText, Layers, Target, Trophy, History as HistoryIcon
} from 'lucide-react';
import type { DebugLevel, DebugCategory } from '@/context/DebugProvider';

interface CategoryConfig {
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  'AI_GENERATION': { icon: Brain, color: 'text-purple-400', description: 'AI test generation flow' },
  'PRACTICE_TEST': { icon: TestTube, color: 'text-green-400', description: 'Practice test operations' },
  'TEST_SUBMISSION': { icon: Send, color: 'text-blue-400', description: 'Test submission tracking' },
  'CONSOLE_ERRORS': { icon: AlertCircle, color: 'text-red-400', description: 'Console errors and warnings' },
  'DEBUG_SYSTEM': { icon: Settings, color: 'text-gray-400', description: 'Debug utility operations' },
  'AUTH': { icon: User, color: 'text-yellow-400', description: 'Authentication operations' },
  'API': { icon: Globe, color: 'text-cyan-400', description: 'API requests and responses' },
  'FIREBASE': { icon: Database, color: 'text-orange-400', description: 'Firebase operations' },
  'UI': { icon: Layers, color: 'text-indigo-400', description: 'User interface interactions' },
  'PERFORMANCE': { icon: BarChart3, color: 'text-pink-400', description: 'Performance monitoring' },
  'SYSTEM': { icon: Settings, color: 'text-gray-500', description: 'System-level operations' },
  'USER_INTERACTION': { icon: Target, color: 'text-emerald-400', description: 'User clicks and inputs' },
  'RATE_LIMITING': { icon: Clock, color: 'text-amber-400', description: 'Rate limiting operations and monitoring' }
};

const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  icon: FileText,
  color: 'text-gray-400',
  description: 'Unknown category'
};

const getCategoryConfig = (category: string): CategoryConfig => {
  return CATEGORY_CONFIGS[category] || DEFAULT_CATEGORY_CONFIG;
};

const LEVEL_CONFIGS = {
  debug: { icon: Info, color: 'text-gray-400', bgColor: 'bg-gray-800', borderClass: 'border-l-gray-500' },
  info: { icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-900', borderClass: 'border-l-blue-500' },
  warn: { icon: AlertTriangle, color: 'text-yellow-400', bgColor: 'bg-yellow-900', borderClass: 'border-l-yellow-500' },
  error: { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-900', borderClass: 'border-l-red-500' },
  critical: { icon: Zap, color: 'text-red-500', bgColor: 'bg-red-800', borderClass: 'border-l-red-500' }
};

export function EnhancedDebugPanel() {
  const { 
    isDebugEnabled, 
    toggleDebug, 
    logs, 
    clearLogs, 
    exportLogs,
    searchLogs,
    getLogStats,
    getAvailableCategories,
    getCategoryStats,
    getLogsByFlow
  } = useDebug();
  
  const [showPanel, setShowPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [fuzzySearch, setFuzzySearch] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [expandedFlows, setExpandedFlows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'category' | 'flow' | 'chronological'>('category');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDataSources, setShowDataSources] = useState(false);

  // Data source tracking state
  const [dataSources, setDataSources] = useState({
    leaderboard_alltime: 'profiles',
    leaderboard_weekly: 'leaderboard_weekly', 
    leaderboard_monthly: 'leaderboard_monthly',
    dashboard: 'testResults',
    history: 'testResults'
  });

  // Auto-refresh logs every 2 seconds when panel is open
  useEffect(() => {
    if (!showPanel || !autoRefresh) return;
    
    const interval = setInterval(() => {
      // Force re-render by updating a dummy state
      setExpandedLogs(prev => new Set(prev));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [showPanel, autoRefresh]);

  // Monitor data sources from API logs
  useEffect(() => {
    const apiLogs = logs.filter(log => 
      log.category === 'API' && 
      log.data && 
      typeof log.data === 'object' && 
      'dataSource' in log.data
    );

    if (apiLogs.length > 0) {
      const latestLog = apiLogs[apiLogs.length - 1];
      const endpoint = latestLog.data?.endpoint || latestLog.message;
      const timeframe = latestLog.data?.timeframe || 'all-time';
      
      if (endpoint?.includes('/api/leaderboard')) {
        const dataSource = latestLog.data?.dataSource || 'profiles';
        
        if (timeframe === 'weekly' || timeframe === 'week') {
          setDataSources(prev => ({
            ...prev,
            leaderboard_weekly: dataSource
          }));
        } else if (timeframe === 'monthly' || timeframe === 'month') {
          setDataSources(prev => ({
            ...prev,
            leaderboard_monthly: dataSource
          }));
        } else {
          setDataSources(prev => ({
            ...prev,
            leaderboard_alltime: dataSource
          }));
        }
      }
    }
  }, [logs]);

  // Get comprehensive statistics
  const stats = useMemo(() => getLogStats(), [logs]);
  const categories = useMemo(() => getAvailableCategories(), [logs]);

  // Enhanced filtering with fuzzy search
  const filteredLogs = useMemo(() => {
    let filtered = logs;
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = searchLogs(searchTerm, fuzzySearch);
    }
    
    // Apply category filter
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(log => 
        log.category.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }
    
    // Apply level filter
    if (selectedLevel !== 'ALL') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }
    
    return filtered.slice(-100); // Show last 100 logs for performance
  }, [logs, searchTerm, fuzzySearch, selectedCategory, selectedLevel, searchLogs]);

  // Group logs by different criteria
  const groupedLogs = useMemo(() => {
    switch (viewMode) {
      case 'flow': {
        const flowGroups = new Map<string, typeof filteredLogs>();
        const noFlowLogs: typeof filteredLogs = [];
        
        filteredLogs.forEach(log => {
          if (log.flowId) {
            if (!flowGroups.has(log.flowId)) {
              flowGroups.set(log.flowId, []);
            }
            flowGroups.get(log.flowId)!.push(log);
          } else {
            noFlowLogs.push(log);
          }
        });
        
        return { flowGroups, noFlowLogs };
      }
        
      case 'category': {
        const categoryGroups = new Map<string, typeof filteredLogs>();
        filteredLogs.forEach(log => {
          if (!categoryGroups.has(log.category)) {
            categoryGroups.set(log.category, []);
          }
          categoryGroups.get(log.category)!.push(log);
        });
        return { categoryGroups };
      }
        
      default:
        return { chronological: filteredLogs };
    }
  }, [filteredLogs, viewMode]);

  // Smart download with category filtering
  const handleSmartDownload = useCallback(() => {
    const categoryFilter = selectedCategory === 'ALL' ? undefined : selectedCategory;
    const data = exportLogs(categoryFilter);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filterSuffix = categoryFilter ? `-${categoryFilter.toLowerCase()}` : '';
    a.download = `zentype-debug-${timestamp}${filterSuffix}.json`;
    
    a.click();
    URL.revokeObjectURL(url);
  }, [exportLogs, selectedCategory]);

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const toggleFlowExpansion = (flowId: string) => {
    setExpandedFlows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(flowId)) {
        newSet.delete(flowId);
      } else {
        newSet.add(flowId);
      }
      return newSet;
    });
  };

  const renderLogEntry = (log: any, isInFlow = false) => {
    const isExpanded = expandedLogs.has(log.id);
    const levelConfig = LEVEL_CONFIGS[log.level as DebugLevel];
    const LevelIcon = levelConfig.icon;
    
    return (
      <div
        key={log.id}
        className={`p-3 rounded border-l-4 cursor-pointer hover:bg-gray-800/30 ${
          isInFlow ? 'ml-4 border-l-gray-600' : levelConfig.borderClass
        }`}
        onClick={() => toggleLogExpansion(log.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <LevelIcon className={`h-3 w-3 ${levelConfig.color}`} />
            <Badge className={`text-xs ${levelConfig.bgColor} ${levelConfig.color}`}>
              {log.level.toUpperCase()}
            </Badge>
            {log.flowId && (
              <Badge variant="outline" className="text-xs">
                Flow: {log.flowId.split('_')[2]}
              </Badge>
            )}
            <span className="text-xs text-gray-400">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div className="text-sm text-white mb-1">
          {log.message}
        </div>
        
        {isExpanded && (
          <div className="mt-2 space-y-2 text-xs">
            {log.data && (
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-400 mb-1">Data:</div>
                <pre className="text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </div>
            )}
            
            {log.metadata && (
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-400 mb-1">Metadata:</div>
                <div className="grid grid-cols-2 gap-2 text-gray-300">
                  {Object.entries(log.metadata).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-gray-400">{key}:</span> {String(value)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {log.location && (
              <div className="text-gray-400">
                Location: <span className="text-gray-300">{log.location}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {/* Toggle Buttons */}
      <div className="flex flex-col items-end gap-2">
        <Button
          onClick={() => setShowPanel(!showPanel)}
          size="sm"
          variant="outline"
          className="bg-green-800 border-green-600 text-green-300 hover:bg-green-700 shadow-lg relative"
        >
          <Bug className="h-4 w-4 mr-1" />
          Debug ON
          <Badge variant="secondary" className="ml-2 bg-blue-600 text-white text-xs">
            {stats.total}
          </Badge>
          {stats.recentErrors.length > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">
              {stats.recentErrors.length} ERR
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

      {/* Enhanced Debug Panel */}
      {showPanel && (
        <div className="fixed bottom-20 right-4 w-[600px] h-[700px] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 p-3 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-green-400" />
              <span className="text-sm font-semibold text-white">Enhanced Debug Panel</span>
              <Badge variant="secondary" className="text-xs">
                v2.0
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => setShowDataSources(!showDataSources)}
                size="sm"
                variant="ghost"
                className={showDataSources 
                  ? "text-blue-400 hover:text-blue-300 p-1" 
                  : "text-gray-400 hover:text-white p-1"
                }
                title="Toggle data source indicators"
              >
                <Database className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                size="sm"
                variant="ghost"
                className={autoRefresh 
                  ? "text-green-400 hover:text-green-300 p-1" 
                  : "text-gray-400 hover:text-white p-1"
                }
                title="Auto refresh"
              >
                <Clock className="h-3 w-3" />
              </Button>
              <Button
                onClick={handleSmartDownload}
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white p-1"
                title="Smart download (filtered)"
              >
                <Download className="h-3 w-3" />
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

          {/* Stats Dashboard */}
          <div className="bg-gray-800/50 p-3 border-b border-gray-700 flex-shrink-0">
            <div className="grid grid-cols-5 gap-3 text-center mb-3">
              <div>
                <div className="text-lg font-semibold text-white">{stats.total}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-red-400">{stats.byLevel.error + stats.byLevel.critical}</div>
                <div className="text-xs text-gray-400">Errors</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-yellow-400">{stats.byLevel.warn}</div>
                <div className="text-xs text-gray-400">Warnings</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-400">{Object.keys(stats.byCategory).length}</div>
                <div className="text-xs text-gray-400">Categories</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-purple-400">{filteredLogs.length}</div>
                <div className="text-xs text-gray-400">Filtered</div>
              </div>
            </div>
          </div>

          {/* Data Source Indicators */}
          {showDataSources && (
            <div className="bg-gray-800/30 p-2 border-b border-gray-700 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-yellow-400" />
                  <span className="text-gray-300">All-Time:</span>
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                    {dataSources.leaderboard_alltime}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-green-400" />
                  <span className="text-gray-300">Weekly:</span>
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                    {dataSources.leaderboard_weekly}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-blue-400" />
                  <span className="text-gray-300">Monthly:</span>
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                    {dataSources.leaderboard_monthly}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3 text-cyan-400" />
                  <span className="text-gray-300">Dashboard:</span>
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                    {dataSources.dashboard}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <HistoryIcon className="h-3 w-3 text-purple-400" />
                  <span className="text-gray-300">History:</span>
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                    {dataSources.history}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Filters */}
          <div className="bg-gray-800/50 p-3 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-3 w-3 text-gray-400" />
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
              >
                <option value="ALL">All Categories</option>
                <option value="AI_GENERATION">AI Generation</option>
                <option value="PRACTICE_TEST">Practice Test</option>
                <option value="TEST_SUBMISSION">Test Submission</option>
                <option value="CONSOLE_ERRORS">Console Errors</option>
                <option value="DEBUG_SYSTEM">Debug System</option>
                <option value="AUTH">Authentication</option>
                <option value="API">API Calls</option>
                <option value="FIREBASE">Firebase</option>
                <option value="UI">User Interface</option>
                <option value="PERFORMANCE">Performance</option>
                <option value="SYSTEM">System</option>
                <option value="USER_INTERACTION">User Interaction</option>
                {categories.filter(cat => !['AI_GENERATION', 'PRACTICE_TEST', 'TEST_SUBMISSION', 'CONSOLE_ERRORS', 'DEBUG_SYSTEM', 'AUTH', 'API', 'FIREBASE', 'UI', 'PERFORMANCE', 'SYSTEM', 'USER_INTERACTION'].includes(cat)).map(cat => {
                  return (
                    <option key={cat} value={cat}>
                      {cat} ({stats.byCategory[cat] || 0})
                    </option>
                  );
                })}
              </select>
              
              <select 
                value={selectedLevel} 
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
              >
                <option value="ALL">All Levels</option>
                {Object.entries(stats.byLevel).map(([level, count]) => (
                  <option key={level} value={level}>
                    {level.toUpperCase()} ({count})
                  </option>
                ))}
              </select>

              <select 
                value={viewMode} 
                onChange={(e) => setViewMode(e.target.value as any)}
                className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
              >
                <option value="category">By Category</option>
                <option value="flow">By Flow</option>
                <option value="chronological">Chronological</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Search className="h-3 w-3 text-gray-400" />
              <Input
                type="text"
                placeholder="Search logs... (try 'ai' or 'error')"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 flex-1"
              />
              <Button
                onClick={() => setFuzzySearch(!fuzzySearch)}
                size="sm"
                variant="ghost"
                className={fuzzySearch 
                  ? "text-purple-400 hover:text-purple-300 p-1 text-xs" 
                  : "text-gray-400 hover:text-white p-1 text-xs"
                }
                title="Fuzzy search"
              >
                ~
              </Button>
            </div>
          </div>

          {/* Logs Display */}
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
                {viewMode === 'flow' && groupedLogs.flowGroups && (
                  <>
                    {Array.from(groupedLogs.flowGroups.entries()).map(([flowId, flowLogs]) => {
                      const isExpanded = expandedFlows.has(flowId);
                      const flowStart = flowLogs.find(log => log.data?.flowStart);
                      const flowEnd = flowLogs.find(log => log.data?.flowEnd);
                      const success = flowEnd?.data?.success;
                      
                      return (
                        <div key={flowId} className="border border-gray-700 rounded">
                          <div 
                            className="bg-gray-800 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-750"
                            onClick={() => toggleFlowExpansion(flowId)}
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <span className="font-medium text-white">
                                Flow: {flowId.split('_')[2]}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {flowLogs.length} steps
                              </Badge>
                              {success !== undefined && (
                                <Badge variant={success ? "default" : "destructive"} className="text-xs">
                                  {success ? "Success" : "Failed"}
                                </Badge>
                              )}
                              {flowEnd?.data?.duration && (
                                <span className="text-xs text-gray-400">
                                  {flowEnd.data.duration}ms
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="p-2 space-y-1">
                              {flowLogs.map(log => renderLogEntry(log, true))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {groupedLogs.noFlowLogs && groupedLogs.noFlowLogs.length > 0 && (
                      <div className="border border-gray-700 rounded">
                        <div className="bg-gray-800 px-3 py-2">
                          <span className="font-medium text-white">Individual Logs</span>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {groupedLogs.noFlowLogs.length}
                          </Badge>
                        </div>
                        <div className="p-2 space-y-1">
                          {groupedLogs.noFlowLogs.map(log => renderLogEntry(log))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {viewMode === 'category' && groupedLogs.categoryGroups && (
                  <>
                    {Array.from(groupedLogs.categoryGroups.entries()).map(([category, categoryLogs]) => {
                      const config = CATEGORY_CONFIGS[category] || { icon: FileText, color: 'text-gray-400', description: 'Unknown category' };
                      const CategoryIcon = config.icon;
                      
                      return (
                        <div key={category} className="border border-gray-700 rounded">
                          <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CategoryIcon className={`h-4 w-4 ${config.color}`} />
                              <span className="font-medium text-white">{category}</span>
                              <Badge variant="secondary" className="text-xs">
                                {categoryLogs.length}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-400">{config.description}</span>
                          </div>
                          <div className="p-2 space-y-1">
                            {categoryLogs.slice(-10).reverse().map(log => renderLogEntry(log))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                
                {viewMode === 'chronological' && groupedLogs.chronological && (
                  <div className="space-y-1">
                    {groupedLogs.chronological.slice().reverse().map(log => renderLogEntry(log))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}