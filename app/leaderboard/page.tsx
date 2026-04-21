"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Header } from "@/components/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Crown, Medal, Award, Zap, Target, Loader2, AlertCircle, Calendar, Clock, TrendingUp } from "lucide-react"
import { useLeaderboard } from "@/hooks/useLeaderboard"
import { useAuth } from "@/context/AuthProvider"

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<string>("all-time");
  const { leaderboard, isLoading, error, dataSource } = useLeaderboard(100, timeframe);
  const { user: currentUser } = useAuth();
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-muted-foreground font-semibold">#{rank}</span>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Global Leaderboard</h1>
          </div>
          <p className="text-muted-foreground">See how you stack up against the world's fastest typists</p>
        </div>

        {/* Timeframe Filter Tabs */}
        <div className="mb-8">
          <Tabs value={timeframe} onValueChange={setTimeframe} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="all-time" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>All Time</span>
              </TabsTrigger>
              <TabsTrigger value="monthly" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Monthly</span>
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Weekly</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Filter Status Indicator */}
          {leaderboard && leaderboard.length > 0 && (
            <div className="flex items-center justify-center mt-2 space-x-2">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span>
                  {timeframe === 'all-time' ? 'All-Time' : timeframe === 'weekly' ? 'Weekly' : 'Monthly'} Rankings
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading leaderboard...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <GlassCard className="mb-8">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Failed to load leaderboard</p>
                <p className="text-sm text-muted-foreground">Error: {error}</p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Empty State - Show when no data and no error */}
        {!isLoading && leaderboard.length === 0 && !error && (
          <GlassCard className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No leaderboard data available</h3>
            <p className="text-muted-foreground">Complete some typing tests to see the leaderboard!</p>
          </GlassCard>
        )}

        {/* Empty State - Show when no data but there was an error */}
        {!isLoading && leaderboard.length === 0 && error && (
          <GlassCard className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Unable to load leaderboard</h3>
            <p className="text-muted-foreground mb-4">There was an error connecting to the database.</p>
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</p>
          </GlassCard>
        )}

        {/* Leaderboard Content */}
        {!isLoading && leaderboard.length > 0 && (
          <>
            {/* Top 3 Podium */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {leaderboard.slice(0, 3).map((user) => (
                <GlassCard
                  key={user.userId}
                  className={`text-center space-y-4 ${user.rank === 1 ? "ring-2 ring-primary" : ""} ${
                     user.userId === currentUser?.uid ? "bg-primary/10" : ""
                   }`}
                >
                  <div className="flex justify-center">{getRankIcon(user.rank)}</div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                       {user.username}
                       {user.userId === currentUser?.uid && (
                         <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">You</span>
                       )}
                     </h3>
                    <div className="text-3xl font-bold text-primary mb-2">{user.bestWpm} WPM</div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>{user.testsCompleted} tests completed</div>
                      <div>{user.averageAccuracy}% accuracy</div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* Full Leaderboard Table */}
            <GlassCard>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-4 px-2 text-foreground font-semibold">Rank</th>
                      <th className="text-left py-4 px-2 text-foreground font-semibold">Username</th>
                      <th className="text-left py-4 px-2 text-foreground font-semibold">
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4" />
                          <span>Best WPM</span>
                        </div>
                      </th>
                      <th className="text-left py-4 px-2 text-foreground font-semibold">Tests Completed</th>
                      <th className="text-left py-4 px-2 text-foreground font-semibold">
                        <div className="flex items-center space-x-2">
                          <Target className="h-4 w-4" />
                          <span>Accuracy</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((user) => (
                      <tr
                        key={user.userId}
                        className={`border-b border-border hover:bg-accent/50 transition-colors ${
                           user.userId === currentUser?.uid ? "bg-primary/10" : ""
                         }`}
                      >
                        <td className="py-4 px-2">
                          <div className="flex items-center space-x-2">{getRankIcon(user.rank)}</div>
                        </td>
                        <td className="py-4 px-2">
                          <span
                             className={`font-semibold ${
                               user.userId === currentUser?.uid ? "text-primary" : "text-foreground"
                             }`}
                           >
                             {user.username}
                             {user.userId === currentUser?.uid && (
                               <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">You</span>
                             )}
                           </span>
                        </td>
                        <td className="py-4 px-2">
                          <span className="text-primary font-bold text-lg">{user.bestWpm}</span>
                        </td>
                        <td className="py-4 px-2 text-muted-foreground">{user.testsCompleted}</td>
                        <td className="py-4 px-2">
                          <span
                            className={`font-semibold ${
                              user.averageAccuracy >= 98
                                ? "text-green-500"
                                : user.averageAccuracy >= 95
                                  ? "text-yellow-500"
                                  : "text-red-500"
                            }`}
                          >
                            {user.averageAccuracy}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </>
        )}


      </main>
    </div>
  )
}
