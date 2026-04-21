"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { Keyboard, User, Mail, Lock, Chrome, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, getRedirectResult, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth"
import { auth } from "@/lib/firebase/client"
import { createUserProfile } from "@/lib/firebase/firestore"

export default function SignupPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [tosAccepted, setTosAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()

  useEffect(() => {
    const handleRedirectSignup = async () => {
      try {
        const result = await getRedirectResult(auth)
        const user = result?.user
        if (!user) return

        await createUserProfile(
          user.uid,
          user.email,
          user.displayName || user.email?.split('@')[0] || 'user',
          user.photoURL || undefined
        )

        console.log("Google redirect signup successful:", user.uid)
        router.push("/dashboard")
      } catch (error: any) {
        console.error("Error completing Google redirect signup:", error)
        setErrorMessage("Unable to complete Google sign up. Please try again.")
      }
    }

    handleRedirectSignup()
  }, [router])

  const handleSignup = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setErrorMessage("") // Clear previous errors
    console.log("🚀 SIGNUP STARTED - User inputs:", { username, email })
    
    try {
      // Create Firebase user first
      console.log("👤 Creating Firebase user...")
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      console.log("✅ Firebase user created - UID:", user.uid)
      
      // Create profile immediately
      console.log("📝 Creating user profile...")
      const profileData = await createUserProfile(user.uid, user.email, username)
      console.log("✅ Profile creation completed:", profileData)
      
      if (!profileData || !profileData.username) {
        console.error("❌ Profile creation failed - no data returned")
        setErrorMessage("Profile creation failed. Please try again.")
        setIsLoading(false)
        return
      }
      
      console.log("🎯 SUCCESS! Profile created with username:", profileData.username)
      
      // VERIFY profile exists by fetching it again
      console.log("🔍 Final verification - fetching profile again...")
      let verifiedProfile = null
      let attempts = 0
      
      while (!verifiedProfile && attempts < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
        try {
          const { getUserProfile } = await import('@/lib/firebase/firestore')
          verifiedProfile = await getUserProfile(user.uid)
          console.log(`✅ Verification attempt ${attempts + 1}:`, verifiedProfile ? `Profile found with username: ${verifiedProfile.username}` : "No profile yet")
          attempts++
        } catch (error) {
          console.error("Verification error:", error)
          attempts++
        }
      }
      
      if (verifiedProfile) {
        console.log("🚀 VERIFIED! Profile exists, safe to redirect")
        console.log("📍 Navigating to dashboard...")
        router.push("/dashboard")
      } else {
        console.error("❌ Could not verify profile creation")
        setErrorMessage("Profile creation issue. Please try logging in.")
        setIsLoading(false)
      }
      
    } catch (error: any) {
      console.error("💥 Signup error:", error)
      
      // Provide user-friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage("An account with this email already exists. Please sign in instead.")
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage("Invalid email address format.")
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage("Password is too weak. Please use at least 6 characters.")
      } else if (error.code === 'auth/operation-not-allowed') {
        setErrorMessage("Email/password accounts are not enabled. Please contact support.")
      } else {
        setErrorMessage(error.message || "Unable to create account. Please try again later.")
      }
      
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setErrorMessage("") // Clear previous errors
    
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: "select_account" })
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      console.log("Google signup successful:", user.uid)
      
      // Create profile immediately with Google data
      console.log("Google signup - Creating profile directly...")
      const profileData = await createUserProfile(
        user.uid, 
        user.email, 
        user.displayName || user.email?.split('@')[0] || 'user',
        user.photoURL || undefined
      )
      console.log("Google signup - Profile created:", profileData)
      
      setTimeout(() => {
        router.push("/dashboard")
      }, 1000)
    } catch (error: any) {
      console.error("Error signing up with Google:", error)
      
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMessage("Sign-up cancelled. Please try again.")
      } else if (error.code === 'auth/popup-blocked') {
        try {
          const provider = new GoogleAuthProvider()
          provider.setCustomParameters({ prompt: "select_account" })
          await signInWithRedirect(auth, provider)
          return
        } catch (redirectError: any) {
          console.error("Error starting Google redirect signup:", redirectError)
          setErrorMessage("Popup was blocked and redirect sign-up failed. Please try again.")
        }
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setErrorMessage("An account already exists with the same email address but different sign-in credentials.")
      } else {
        setErrorMessage("Unable to sign up with Google. Please try again later.")
      }
      
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Join ZenType</h1>
            <p className="text-muted-foreground">
              Create your account and start improving your typing skills
            </p>
          </div>

          <div className="space-y-6 rounded-2xl backdrop-blur-xl bg-card p-6 border border-border shadow-lg">
            {errorMessage && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{errorMessage}</p>
              </div>
            )}
            
            <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

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
                    placeholder="Create a password"
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

              <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-secondary">
                <input
                  id="tos-checkbox"
                  type="checkbox"
                  checked={tosAccepted}
                  onChange={(e) => setTosAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input text-[#00A3FF] focus:ring-[#00A3FF] focus:ring-offset-0 bg-background cursor-pointer"
                />
                <label htmlFor="tos-checkbox" className="text-sm text-foreground cursor-pointer">
                  I agree to the{" "}
                  <Link href="/terms-of-service" target="_blank" className="text-[#00A3FF] hover:underline">
                    Terms of Service
                  </Link>
                  {" "}and{" "}
                  <Link href="/privacy-policy" target="_blank" className="text-[#00A3FF] hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button 
                type="submit"
                disabled={isLoading || !tosAccepted}
                className="w-full bg-[#00A3FF] hover:bg-[#0088cc] text-white disabled:opacity-50"
              >
                {isLoading ? "Creating Account..." : "Create Account"}
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
                onClick={handleGoogleSignup}
                variant="outline"
                disabled={isLoading}
                className="w-full disabled:opacity-50"
              >
                <Chrome className="mr-2 h-4 w-4" />
                Sign in with Google
              </Button>

              <Button
                onClick={() => console.log("Guest signup clicked - implement signInAnonymously later if needed")}
                variant="ghost"
                disabled={isLoading}
                className="w-full disabled:opacity-50"
              >
                Continue as Guest
              </Button>
            </div>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/login" className="text-[#00A3FF] hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}