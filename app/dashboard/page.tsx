"use client"

import dynamic from 'next/dynamic';
import { GlassCard } from "@/components/ui/glass-card"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Trophy, Target, Clock, TrendingUp, Calendar, Zap, Play } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { calculateUserStats } from "@/lib/firebase/firestore"
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase/client"

// Dynamic import for ProgressChart (lazy load recharts library)
const ProgressChart = dynamic(() => import('@/components/dashboard/progress-chart'), {
  ssr: true,  // Keep SSR for better UX
  loading: () => (
    <div className="h-64 w-full flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFFF] mx-auto"></div>
        <p className="text-sm text-muted-foreground">Loading chart...</p>
      </div>
    </div>
  )
});

export default function DashboardPage() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const [userStats, setUserStats] = useState<{
    rank: string;
    avgWpm: number;
    avgAcc: number;
    testsCompleted: number;
    bestWpm: number;
    bestAccuracy: number;
  } | null>(null);
  
  const [recentTests, setRecentTests] = useState<Array<{
    id: string;
    wpm: number;
    accuracy: number;
    testType: string;
    difficulty: string;
    createdAt: string;
  }>>([]);

  const [progressData, setProgressData] = useState<Array<{
    id: string;
    date: string;
    wpm: number;
    accuracy: number;
    time: string;
  }>>([]);

  useEffect(() => {
    console.log("📊 Dashboard - useEffect triggered");
    console.log("👤 Dashboard - User:", user ? user.uid : "null");
    console.log("📋 Dashboard - Profile:", profile);
    console.log("🏷️  Dashboard - Username:", profile?.username || "undefined");
    console.log("⏳ Dashboard - IsLoading:", isLoading);
    
    if (user && profile) {
      console.log("✅ Dashboard - Both user and profile available, calculating stats...");
      calculateUserStats(user.uid).then(setUserStats);
      
      // Fetch recent test results
      fetchRecentTests();
      
      // Fetch progress data for chart
      fetchProgressData();
    } else if (user && !profile) {
      console.log("⚠️ Dashboard - User exists but no profile yet");
    } else if (!user) {
      console.log("🚫 Dashboard - No user authenticated");
    }
  }, [user, profile, isLoading]);

  const fetchRecentTests = async () => {
    if (!user) return;
    
    try {
      console.log("🔍 Dashboard - Fetching recent test results...");
      const testResultsRef = collection(db, "testResults");
      // Fetch without orderBy to avoid needing composite index
      const q = query(
        testResultsRef,
        where("userId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const recentTestsData = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            wpm: data.wpm,
            accuracy: data.accuracy,
            testType: data.testType,
            difficulty: data.difficulty,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
            timestamp: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : 0,
          };
        })
        // Sort client-side by timestamp descending
        .sort((a, b) => b.timestamp - a.timestamp)
        // Take only the 5 most recent
        .slice(0, 5);
      
      console.log("✅ Dashboard - Recent tests fetched:", recentTestsData.length);
      setRecentTests(recentTestsData);
    } catch (error) {
      console.error("❌ Dashboard - Error fetching recent tests:", error);
    }
  };

  const fetchProgressData = async () => {
    if (!user) return;
    
    try {
      console.log("📈 Dashboard - Fetching progress data for chart...");
      const testResultsRef = collection(db, "testResults");
      // Fetch without orderBy to avoid needing composite index
      const q = query(
        testResultsRef,
        where("userId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const chartData = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          const testDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          return {
            id: doc.id, // Unique ID for React keys
            date: testDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            wpm: Math.round(data.wpm || 0),
            accuracy: Math.round(data.accuracy || 0),
            time: testDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            timestamp: testDate.getTime(),
          };
        })
        // Sort client-side by timestamp ascending (oldest to newest for chart)
        .sort((a, b) => a.timestamp - b.timestamp)
        // Take last 30 tests
        .slice(-30);
      
      console.log("✅ Dashboard - Progress data fetched:", chartData.length);
      setProgressData(chartData);
    } catch (error) {
      console.error("❌ Dashboard - Error fetching progress data:", error);
    }
  };

  // Show loading state OR if user exists but no profile yet
  if (isLoading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">
              {isLoading ? "Loading your account..." : "Setting up your profile..."}
            </p>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
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
            <p className="text-muted-foreground">Please log in to view your dashboard.</p>
          </div>
        </main>
      </div>
    );
  }

  // Show empty state if user has no typing data (null userStats or 0 tests)
  if (!userStats || userStats.testsCompleted === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          
          <div className="text-center space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Welcome, {profile?.username || 'Typer'}!
              </h1>
              <p className="text-muted-foreground">
                You don't have any typing data yet. Start your typing journey!
              </p>
            </div>
            
            <div className="max-w-md mx-auto">
              <GlassCard className="text-center space-y-6 p-8">
                <div className="w-16 h-16 bg-[#00BFFF] rounded-full flex items-center justify-center mx-auto">
                  <Play className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Ready to start typing?</h2>
                  <p className="text-muted-foreground text-sm">
                    Take your first typing test to see your stats here!
                  </p>
                </div>
                <Button 
                  onClick={() => router.push('/test')}
                  className="bg-[#00BFFF] hover:bg-[#0099CC] text-white px-6 py-3"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Typing
                </Button>
              </GlassCard>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome, {profile?.username || 'Typer'}!
          </h1>
          <p className="text-muted-foreground">Track your progress and continue improving your typing skills</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <GlassCard className="text-center space-y-3">
            <div className="w-12 h-12 bg-[#00BFFF] rounded-lg flex items-center justify-center mx-auto">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#00BFFF]">{userStats?.avgWpm || 0}</div>
              <div className="text-foreground text-sm">Avg WPM</div>
            </div>
          </GlassCard>

          <GlassCard className="text-center space-y-3">
            <div className="w-12 h-12 bg-[#00BFFF] rounded-lg flex items-center justify-center mx-auto">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#00BFFF]">{userStats?.avgAcc || 0}%</div>
              <div className="text-foreground text-sm">Avg Accuracy</div>
            </div>
          </GlassCard>

          <GlassCard className="text-center space-y-3">
            <div className="w-12 h-12 bg-[#00BFFF] rounded-lg flex items-center justify-center mx-auto">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#00BFFF]">{userStats?.testsCompleted || 0}</div>
              <div className="text-foreground text-sm">Tests Completed</div>
            </div>
          </GlassCard>

          <GlassCard className="text-center space-y-3">
            <div className="w-12 h-12 bg-[#00BFFF] rounded-lg flex items-center justify-center mx-auto">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#00BFFF]">{userStats?.rank || 'E'}</div>
              <div className="text-foreground text-sm">Current Rank</div>
            </div>
          </GlassCard>
        </div>

        {/* Progress Chart - Full Width */}
        <div className="mb-8">
          <GlassCard>
            <div className="flex items-center space-x-2 mb-6">
              <TrendingUp className="h-5 w-5 text-[#00BFFF]" />
              <h2 className="text-xl font-semibold text-foreground">Your Progress</h2>
            </div>
            <ProgressChart 
              data={progressData}
              currentWpm={userStats?.avgWpm}
              currentAccuracy={userStats?.avgAcc}
            />
          </GlassCard>
        </div>

        {/* Recent Activity Card */}
        <div>
          <GlassCard>
            <div className="flex items-center space-x-2 mb-6">
              <Clock className="h-5 w-5 text-[#00BFFF]" />
              <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
            </div>
            <div className="h-64">
              {recentTests.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recentTests.map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-[#00BFFF] rounded-full flex items-center justify-center">
                          <Zap className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {test.testType === 'practice' ? 'Practice Test' : test.testType}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {test.difficulty} • {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'Unknown Date'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#00BFFF]">{test.wpm} WPM</p>
                        <p className="text-xs text-muted-foreground">{test.accuracy}% accuracy</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 bg-muted/40 rounded-lg flex items-center justify-center mx-auto">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">No recent activity</p>
                      <p className="text-muted-foreground text-xs">
                        Your recent test results will appear here
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  )
}
