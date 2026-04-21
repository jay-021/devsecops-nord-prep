"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { History, Calendar, Target, Zap, Clock, Play } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { useRouter } from "next/navigation"
import { TestResult } from "@/lib/types/database"
import { useState, useEffect } from "react"
import { collection, query, where, orderBy, limit, startAfter, getDocs, DocumentSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase/client"

export default function HistoryPage() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch initial test history when user is available
  useEffect(() => {
    if (user) {
      fetchTestHistory();
    }
  }, [user]);

  const fetchTestHistory = async (loadMore = false) => {
    if (!user) return;
    
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setHistoryLoading(true);
        setTestHistory([]);
        setLastVisible(null);
        setHasMore(true);
      }

      console.log("🔍 History - Fetching test results...");
      const testResultsRef = collection(db, "testResults");
      let q = query(
        testResultsRef,
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(20)
      );

      // Add pagination if loading more
      if (loadMore && lastVisible) {
        q = query(
          testResultsRef,
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          startAfter(lastVisible),
          limit(20)
        );
      }

      const querySnapshot = await getDocs(q);
      const newTests = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          textLength: data.textLength,
          userInput: data.userInput,
          wpm: data.wpm,
          accuracy: data.accuracy,
          errors: data.errors,
          timeTaken: data.timeTaken,
          testType: data.testType,
          difficulty: data.difficulty,
          completedAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        };
      });

      if (loadMore) {
        setTestHistory(prev => [...prev, ...newTests]);
      } else {
        setTestHistory(newTests);
      }

      // Update pagination state
      if (querySnapshot.docs.length < 20) {
        setHasMore(false);
      } else {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }

      console.log("✅ History - Test results fetched:", newTests.length);
    } catch (error) {
      console.error("❌ History - Error fetching test results:", error);
    } finally {
      setHistoryLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreTests = () => {
    if (hasMore && !loadingMore) {
      fetchTestHistory(true);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show login prompt for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Please log in to view your test history.</p>
          </div>
        </main>
      </div>
    );
  }

  // Check if user has test history
  const hasTestHistory = testHistory.length > 0;

  if (historyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Loading test history...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!hasTestHistory) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <History className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Test History</h1>
            </div>
            <p className="text-muted-foreground">
              Review your past typing test performances and track your improvement over time
            </p>
          </div>

          <GlassCard className="text-center py-16">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 bg-muted/40 rounded-full flex items-center justify-center mx-auto">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">No typing history yet</h2>
                <p className="text-muted-foreground text-sm">
                  Your completed typing tests will appear here. Start typing to build your history!
                </p>
              </div>
              <Button 
                onClick={() => router.push('/test')}
                className="bg-[#00BFFF] hover:bg-[#0099CC] text-white px-6 py-3"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Typing
              </Button>
            </div>
          </GlassCard>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <History className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Test History</h1>
          </div>
          <p className="text-muted-foreground">
            Review your past typing test performances and track your improvement over time
          </p>
        </div>

        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-2 text-foreground font-semibold">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Date</span>
                    </div>
                  </th>
                  <th className="text-left py-4 px-2 text-foreground font-semibold">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4" />
                      <span>WPM</span>
                    </div>
                  </th>
                  <th className="text-left py-4 px-2 text-foreground font-semibold">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4" />
                      <span>Accuracy</span>
                    </div>
                  </th>
                  <th className="text-left py-4 px-2 text-foreground font-semibold">Mode</th>
                  <th className="text-left py-4 px-2 text-foreground font-semibold">Difficulty</th>
                  <th className="text-left py-4 px-2 text-foreground font-semibold">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Time</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {testHistory.map((test, index) => (
                  <tr key={test.id || index} className="border-b border-border/50">
                    <td className="py-4 px-2 text-foreground">
                      {test.completedAt ? new Date(test.completedAt).toLocaleDateString() : 'Unknown Date'}
                    </td>
                    <td className="py-4 px-2">
                      <span className="font-semibold text-primary">{test.wpm}</span>
                    </td>
                    <td className="py-4 px-2">
                      <span className="font-semibold text-green-500">{test.accuracy}%</span>
                    </td>
                    <td className="py-4 px-2 text-muted-foreground capitalize">
                      {test.testType === 'practice' ? 'Practice' : test.testType}
                    </td>
                    <td className="py-4 px-2 text-muted-foreground">
                      {test.difficulty || 'Medium'}
                    </td>
                    <td className="py-4 px-2 text-muted-foreground">
                      {Math.floor(test.timeTaken / 60)}:{String(test.timeTaken % 60).padStart(2, '0')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center py-6 border-t border-border">
              <Button
                onClick={loadMoreTests}
                disabled={loadingMore}
                variant="outline"
                className="border-border text-foreground hover:bg-accent bg-transparent"
              >
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground mr-2"></div>
                    Loading...
                  </>
                ) : (
                  'Load More Tests'
                )}
              </Button>
            </div>
          )}
        </GlassCard>
      </main>
    </div>
  )
}
