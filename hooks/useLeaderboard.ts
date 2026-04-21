'use client';

import { useState, useEffect } from 'react';
import { useCorrelationId } from './useCorrelationId';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  bestWpm: number;
  testsCompleted: number;
  averageAccuracy: number;
  userId: string;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  dataSource?: string;
  count?: number;
  filters?: any;
  correlationId?: string;
}

interface UseLeaderboardReturn {
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  dataSource?: string;
}

/**
 * Custom hook to fetch and manage leaderboard data
 * Provides loading states, error handling, and fallback to dummy data
 */
export function useLeaderboard(limit: number = 100, timeframe: string = 'all-time'): UseLeaderboardReturn {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string | undefined>(undefined);
  const { getHeaders } = useCorrelationId();

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/leaderboard?limit=${limit}&timeframe=${timeframe}`, {
        method: 'GET',
        headers: getHeaders({
          'Content-Type': 'application/json',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }

      const data: LeaderboardResponse = await response.json();
      
      if (data.leaderboard && Array.isArray(data.leaderboard)) {
        setLeaderboard(data.leaderboard);
        setDataSource(data.dataSource);
      } else {
        throw new Error('Invalid leaderboard data format');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      setLeaderboard([]); // Clear leaderboard on error
    } finally {
      setIsLoading(false);
    }
  };

  // Generate fallback dummy data that matches the expected structure
  const generateFallbackLeaderboard = (): LeaderboardEntry[] => {
    return [
      {
        rank: 1,
        username: "SpeedDemon",
        bestWpm: 142,
        testsCompleted: 1247,
        averageAccuracy: 98.2,
        userId: "fallback-1"
      },
      {
        rank: 2,
        username: "TypeMaster",
        bestWpm: 138,
        testsCompleted: 892,
        averageAccuracy: 97.8,
        userId: "fallback-2"
      },
      {
        rank: 3,
        username: "KeyboardNinja",
        bestWpm: 135,
        testsCompleted: 1156,
        averageAccuracy: 96.9,
        userId: "fallback-3"
      },
      {
        rank: 4,
        username: "FlashFingers",
        bestWpm: 132,
        testsCompleted: 743,
        averageAccuracy: 98.1,
        userId: "fallback-4"
      },
      {
        rank: 5,
        username: "RapidRacer",
        bestWpm: 129,
        testsCompleted: 634,
        averageAccuracy: 95.7,
        userId: "fallback-5"
      },
      {
        rank: 6,
        username: "QuickStroke",
        bestWpm: 126,
        testsCompleted: 521,
        averageAccuracy: 97.3,
        userId: "fallback-6"
      },
      {
        rank: 7,
        username: "TypePro",
        bestWpm: 123,
        testsCompleted: 445,
        averageAccuracy: 96.2,
        userId: "fallback-7"
      },
      {
        rank: 8,
        username: "SwiftTyper",
        bestWpm: 120,
        testsCompleted: 389,
        averageAccuracy: 94.8,
        userId: "fallback-8"
      },
      {
        rank: 9,
        username: "LightningKeys",
        bestWpm: 118,
        testsCompleted: 312,
        averageAccuracy: 95.9,
        userId: "fallback-9"
      },
      {
        rank: 10,
        username: "TypingWizard",
        bestWpm: 115,
        testsCompleted: 278,
        averageAccuracy: 93.4,
        userId: "fallback-10"
      }
    ];
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [limit, timeframe]);

  return {
    leaderboard,
    isLoading,
    error,
    refetch: fetchLeaderboard,
    dataSource,
  };
}