"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { Keyboard, User, Trophy, History, BarChart3, Settings, FileText, Shield, LogOut } from "lucide-react"
import { useAuth } from "@/context/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

const navigation = [
  { name: "Test", href: "/test", icon: Keyboard },
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "History", href: "/history", icon: History },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Header(): JSX.Element {
  const pathname = usePathname()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const { user, profile, isLoading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
      // TODO: Display user-friendly error message
    }
  };

  if (isLoading) {
    // Skeleton loading state
    return (
      <header className="sticky top-0 z-50 w-full bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="h-6 w-24 bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 bg-gray-700 rounded-full animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-700 rounded-full animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2 group">
          <Keyboard className="h-8 w-8 text-primary icon-glow transition-all duration-300 group-hover:scale-110" />
          <span className="text-2xl font-bold text-foreground">ZenType</span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                    pathname === item.href
                      ? "bg-[#00BFFF] text-white shadow-lg hover:bg-[#0099CC]"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent hover:shadow-md"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${pathname === item.href ? "text-white" : ""}`} />
                  <span className={pathname === item.href ? "text-white font-medium" : ""}>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        )}

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-300"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <User className="h-5 w-5" />
            </Button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 z-50">
                <GlassCard className="border border-border rounded-xl shadow-xl backdrop-blur-xl">
                  <div className="p-3">
                    {user && profile ? (
                      <div className="flex items-center space-x-3">
                        <img
                          src={profile.photoURL || "/placeholder-user.jpg"}
                          alt="User Avatar"
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate" title={profile.username}>{profile.username}</p>
                          <p className="text-xs text-muted-foreground truncate" title={profile.email || undefined}>{profile.email}</p>
                        </div>
                      </div>
                    ) : user && !profile ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-[#5D3FD3] to-[#00BFFF] rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">Loading...</p>
                          <p className="text-xs text-muted-foreground truncate" title={user.email || undefined}>{user.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-[#5D3FD3] to-[#00BFFF] rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">Guest User</p>
                          <p className="text-xs text-muted-foreground">Not logged in</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="py-2">
                    {user ? (
                      <>
                        <button className="flex items-center w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 rounded-lg mx-2">
                          <User className="h-4 w-4 mr-3" />
                          Profile
                        </button>
                        <Link
                          href="/settings"
                          className="flex items-center w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 rounded-lg mx-2"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Settings
                        </Link>
                        <Link
                          href="/terms-of-service"
                          className="flex items-center w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 rounded-lg mx-2"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <FileText className="h-4 w-4 mr-3" />
                          Terms of Service
                        </Link>
                        <Link
                          href="/privacy-policy"
                          className="flex items-center w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 rounded-lg mx-2"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Shield className="h-4 w-4 mr-3" />
                          Privacy Policy
                        </Link>
                        <hr className="my-2 border-border mx-2" />
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-3 text-sm text-destructive hover:text-destructive-foreground hover:bg-destructive/10 transition-all duration-200 rounded-lg mx-2"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Link
                          href="/login"
                          className="flex items-center w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 rounded-lg mx-2"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Login
                        </Link>
                        <Link
                          href="/signup"
                          className="flex items-center w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 rounded-lg mx-2"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4 mr-3" />
                          Sign Up
                        </Link>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
