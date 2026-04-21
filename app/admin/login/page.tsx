"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase/client"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()

  const handleAdminLogin = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setErrorMessage("") // Clear previous errors
    
    try {
      // Step 1: Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      console.log("[Admin Login] User authenticated", { uid: user.uid, email: user.email })
      
      // Step 2: Get ID token with custom claims
      const idToken = await user.getIdToken(true) // Force refresh to get latest claims
      
      // Step 3: Verify admin access via API
      const response = await fetch('/api/v1/admin/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Admin verification failed')
      }
      
      const data = await response.json()
      
      console.log("[Admin Login] Admin access verified", { 
        role: data.role,
        permissions: data.permissions 
      })
      
      // Step 4: Redirect to admin dashboard
      router.push("/admin")
    } catch (error: any) {
      console.error("[Admin Login] Login failed:", error)
      
      // Provide user-friendly error messages
      if (error.message === 'Admin verification failed' || error.message.includes('Insufficient permissions')) {
        setErrorMessage("Access denied. This account does not have admin privileges.")
      } else if (error.code === 'auth/invalid-credential') {
        setErrorMessage("Invalid email or password. Please check your credentials and try again.")
      } else if (error.code === 'auth/user-not-found') {
        setErrorMessage("No account found with this email address.")
      } else if (error.code === 'auth/wrong-password') {
        setErrorMessage("Incorrect password. Please try again.")
      } else if (error.code === 'auth/too-many-requests') {
        setErrorMessage("Too many failed login attempts. Please try again later.")
      } else if (error.code === 'auth/user-disabled') {
        setErrorMessage("This account has been disabled. Please contact support.")
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage("Invalid email address format.")
      } else {
        setErrorMessage("Unable to sign in. Please try again later.")
      }
      
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && email && password) {
      handleAdminLogin()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-md mx-auto">
          {/* Admin Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
              <Shield className="w-5 h-5 text-red-500" />
              <span className="text-sm font-semibold text-red-500">Admin Access Only</span>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-xl p-8 shadow-lg">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Admin Login</h1>
              <p className="text-muted-foreground">
                Restricted access for administrators only
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{errorMessage}</p>
              </div>
            )}

            {/* Login Form */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@zentype.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 bg-background/50 border-border text-foreground placeholder:text-muted-foreground"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 pr-10 bg-background/50 border-border text-foreground placeholder:text-muted-foreground"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                onClick={handleAdminLogin} 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-lg transition-all duration-200"
                disabled={isLoading || !email || !password}
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Sign In as Admin
                  </>
                )}
              </Button>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                🔒 This login is for administrators only. All login attempts are logged and monitored.
              </p>
            </div>

            {/* Back to Main Site */}
            <div className="mt-8 text-center">
              <Link 
                href="/login" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to regular login
              </Link>
            </div>
          </div>

          {/* Support Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Need admin access? Contact{" "}
              <a href="mailto:support@zentype.app" className="text-primary hover:underline">
                support@zentype.app
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
