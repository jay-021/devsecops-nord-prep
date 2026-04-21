// Structured dummy data for ZenType application
// This data is designed to be easily replaceable with real API calls

export interface TypingTest {
  id: string
  date: string
  wpm: number
  accuracy: number
  duration: number
  mode: string
  text: string
}

export interface User {
  id: string
  username: string
  avatar: string
  wpm: number
  accuracy: number
  testsCompleted: number
  rank: number
}

export interface DashboardStats {
  averageWpm: number
  averageAccuracy: number
  totalTests: number
  totalTimeTyped: number
  bestWpm: number
  bestAccuracy: number
  currentStreak: number
  longestStreak: number
}

// Dashboard Statistics
export const DASHBOARD_STATS: DashboardStats = {
  averageWpm: 72,
  averageAccuracy: 94.5,
  totalTests: 156,
  totalTimeTyped: 2340, // in minutes
  bestWpm: 89,
  bestAccuracy: 98.2,
  currentStreak: 7,
  longestStreak: 23,
}

// Recent typing tests for dashboard
export const RECENT_TESTS: TypingTest[] = [
  {
    id: "1",
    date: "2024-01-15",
    wpm: 78,
    accuracy: 96.2,
    duration: 60,
    mode: "1 minute",
    text: "The quick brown fox jumps over the lazy dog...",
  },
  {
    id: "2",
    date: "2024-01-14",
    wpm: 74,
    accuracy: 93.8,
    duration: 120,
    mode: "2 minutes",
    text: "In a hole in the ground there lived a hobbit...",
  },
  {
    id: "3",
    date: "2024-01-13",
    wpm: 81,
    accuracy: 95.1,
    duration: 60,
    mode: "1 minute",
    text: "To be or not to be, that is the question...",
  },
]

// Complete typing history
export const TYPING_HISTORY: TypingTest[] = [
  {
    id: "1",
    date: "2024-01-15",
    wpm: 78,
    accuracy: 96.2,
    duration: 60,
    mode: "1 minute",
    text: "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet at least once.",
  },
  {
    id: "2",
    date: "2024-01-14",
    wpm: 74,
    accuracy: 93.8,
    duration: 120,
    mode: "2 minutes",
    text: "In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole filled with the ends of worms.",
  },
  {
    id: "3",
    date: "2024-01-13",
    wpm: 81,
    accuracy: 95.1,
    duration: 60,
    mode: "1 minute",
    text: "To be or not to be, that is the question: Whether 'tis nobler in the mind to suffer the slings and arrows.",
  },
  {
    id: "4",
    date: "2024-01-12",
    wpm: 69,
    accuracy: 91.7,
    duration: 180,
    mode: "3 minutes",
    text: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.",
  },
  {
    id: "5",
    date: "2024-01-11",
    wpm: 76,
    accuracy: 94.3,
    duration: 60,
    mode: "1 minute",
    text: "Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse.",
  },
  {
    id: "6",
    date: "2024-01-10",
    wpm: 83,
    accuracy: 97.1,
    duration: 120,
    mode: "2 minutes",
    text: "All happy families are alike; each unhappy family is unhappy in its own way. Everything was in confusion.",
  },
  {
    id: "7",
    date: "2024-01-09",
    wpm: 71,
    accuracy: 92.4,
    duration: 60,
    mode: "1 minute",
    text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
  },
  {
    id: "8",
    date: "2024-01-08",
    wpm: 77,
    accuracy: 95.8,
    duration: 180,
    mode: "3 minutes",
    text: "Last night I dreamt I went to Manderley again. It seemed to me I stood by the iron gate leading to the drive.",
  },
]

// Leaderboard data
export const LEADERBOARD_USERS: User[] = [
  {
    id: "1",
    username: "TypeMaster2024",
    avatar: "/diverse-user-avatars.png",
    wpm: 127,
    accuracy: 98.9,
    testsCompleted: 2847,
    rank: 1,
  },
  {
    id: "2",
    username: "KeyboardNinja",
    avatar: "/ninja-avatar.png",
    wpm: 119,
    accuracy: 97.8,
    testsCompleted: 1923,
    rank: 2,
  },
  {
    id: "3",
    username: "SpeedDemon",
    avatar: "/demon-avatar.png",
    wpm: 115,
    accuracy: 96.7,
    testsCompleted: 1456,
    rank: 3,
  },
  {
    id: "4",
    username: "FingerFlash",
    avatar: "/flash-avatar.jpg",
    wpm: 108,
    accuracy: 95.9,
    testsCompleted: 987,
    rank: 4,
  },
  {
    id: "5",
    username: "QuickKeys",
    avatar: "/keys-avatar.jpg",
    wpm: 104,
    accuracy: 94.8,
    testsCompleted: 743,
    rank: 5,
  },
  {
    id: "6",
    username: "TypeRacer",
    avatar: "/racer-avatar.jpg",
    wpm: 98,
    accuracy: 93.7,
    testsCompleted: 621,
    rank: 6,
  },
  {
    id: "7",
    username: "KeyStroke",
    avatar: "/stroke-avatar.jpg",
    wpm: 94,
    accuracy: 92.6,
    testsCompleted: 534,
    rank: 7,
  },
  {
    id: "8",
    username: "FastFingers",
    avatar: "/fingers-avatar.jpg",
    wpm: 89,
    accuracy: 91.5,
    testsCompleted: 456,
    rank: 8,
  },
  {
    id: "9",
    username: "TypingPro",
    avatar: "/professional-avatar.png",
    wpm: 85,
    accuracy: 90.4,
    testsCompleted: 389,
    rank: 9,
  },
  {
    id: "10",
    username: "KeyMaster",
    avatar: "/master-avatar.jpg",
    wpm: 81,
    accuracy: 89.3,
    testsCompleted: 312,
    rank: 10,
  },
]

// Chart data for dashboard
export const WPM_CHART_DATA = [
  { date: "Jan 1", wpm: 65 },
  { date: "Jan 2", wpm: 68 },
  { date: "Jan 3", wpm: 71 },
  { date: "Jan 4", wpm: 69 },
  { date: "Jan 5", wpm: 73 },
  { date: "Jan 6", wpm: 76 },
  { date: "Jan 7", wpm: 74 },
  { date: "Jan 8", wpm: 77 },
  { date: "Jan 9", wpm: 71 },
  { date: "Jan 10", wpm: 83 },
  { date: "Jan 11", wpm: 76 },
  { date: "Jan 12", wpm: 69 },
  { date: "Jan 13", wpm: 81 },
  { date: "Jan 14", wpm: 74 },
  { date: "Jan 15", wpm: 78 },
]

export const ACCURACY_CHART_DATA = [
  { date: "Jan 1", accuracy: 91.2 },
  { date: "Jan 2", accuracy: 92.5 },
  { date: "Jan 3", accuracy: 93.1 },
  { date: "Jan 4", accuracy: 90.8 },
  { date: "Jan 5", accuracy: 94.2 },
  { date: "Jan 6", accuracy: 95.7 },
  { date: "Jan 7", accuracy: 93.9 },
  { date: "Jan 8", accuracy: 95.8 },
  { date: "Jan 9", accuracy: 92.4 },
  { date: "Jan 10", accuracy: 97.1 },
  { date: "Jan 11", accuracy: 94.3 },
  { date: "Jan 12", accuracy: 91.7 },
  { date: "Jan 13", accuracy: 95.1 },
  { date: "Jan 14", accuracy: 93.8 },
  { date: "Jan 15", accuracy: 96.2 },
]

export const TEST_HISTORY = TYPING_HISTORY.map((test) => ({
  date: test.date,
  wpm: test.wpm,
  accuracy: test.accuracy,
  mode: test.mode === "1 minute" ? "Practice" : test.mode === "2 minutes" ? "AI-Generated" : "Practice",
  difficulty: test.wpm > 80 ? "Hard" : test.wpm > 70 ? "Medium" : "Easy",
  time: test.mode,
}))

export const LEADERBOARD_DATA = LEADERBOARD_USERS.map((user) => ({
  rank: user.rank,
  username: user.username,
  bestWpm: user.wpm,
  testsCompleted: user.testsCompleted,
  accuracy: user.accuracy,
}))
