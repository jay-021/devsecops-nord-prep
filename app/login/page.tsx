"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { Keyboard, Mail, Lock, Chrome, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { getRedirectResult, GoogleAuthProvider, signInAnonymously, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect } from "firebase/auth"
import { auth } from "@/lib/firebase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()

  useEffect(() => {
    const handleRedirectSignIn = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result?.user) {
          console.log("Google redirect login successful:", result.user.uid)
          router.push("/dashboard")
        }
      } catch (error: any) {
        console.error("Error completing Google redirect login:", error)
        setErrorMessage("Unable to complete Google sign in. Please try again.")
      }
    }

    handleRedirectSignIn()
  }, [router])

  const handleLogin = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setErrorMessage("") // Clear previous errors
    
    try {
      await signInWithEmailAndPassword(auth, email, password)
      console.log("Login successful")
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error logging in with email and password:", error)
      
      // Provide user-friendly error messages
      if (error.code === 'auth/invalid-credential') {
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

  const handleGoogleLogin = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setErrorMessage("") // Clear previous errors
    
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: "select_account" })
      const result = await signInWithPopup(auth, provider)
      console.log("Google login successful:", result.user.uid)
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error logging in with Google:", error)
      
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMessage("Sign-in cancelled. Please try again.")
      } else if (error.code === 'auth/popup-blocked') {
        try {
          const provider = new GoogleAuthProvider()
          provider.setCustomParameters({ prompt: "select_account" })
          await signInWithRedirect(auth, provider)
          return
        } catch (redirectError: any) {
          console.error("Error starting Google redirect login:", redirectError)
          setErrorMessage("Popup was blocked and redirect sign-in failed. Please try again.")
        }
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setErrorMessage("An account already exists with the same email address but different sign-in credentials.")
      } else {
        setErrorMessage("Unable to sign in with Google. Please try again later.")
      }
      
      setIsLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setErrorMessage("") // Clear previous errors
    
    try {
      await signInAnonymously(auth)
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error signing in anonymously:", error)
      setErrorMessage("Unable to sign in as guest. Please try again later.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#00A3FF] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Keyboard className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">
              Sign in to continue your typing journey
            </p>
          </div>

          <div className="space-y-6 rounded-2xl backdrop-blur-xl bg-card p-6 border border-border shadow-lg">
            {errorMessage && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{errorMessage}</p>
              </div>
            )}
            
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background border-input text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#00A3FF] hover:bg-[#0088cc] text-white disabled:opacity-50"
              >
                {isLoading ? "Signing In..." : "Login"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleGoogleLogin}
                variant="outline"
                disabled={isLoading}
                className="w-full disabled:opacity-50"
              >
                <Chrome className="mr-2 h-4 w-4" />
                Sign in with Google
              </Button>

              <Button
                onClick={handleGuestLogin}
                variant="ghost"
                disabled={isLoading}
                className="w-full disabled:opacity-50"
              >
                Continue as Guest
              </Button>
            </div>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/signup" className="text-[#00A3FF] hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}