"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, SettingsIcon, AlertTriangle, Trash2, Palette, Type, Volume2 } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { updateUserProfile } from "@/lib/firebase/firestore"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import { SOUND_PACKS } from "@/hooks/useKeyboardSound"
import { EmailAuthProvider, reauthenticateWithCredential, GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup } from "firebase/auth"
import { auth } from "@/lib/firebase/client"

export default function SettingsPage() {
  const { user, profile, isLoading } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [keyboardSounds, setKeyboardSounds] = useState(true)
  const [visualFeedback, setVisualFeedback] = useState(true)
  const [autoSaveAiTests, setAutoSaveAiTests] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deletePassword, setDeletePassword] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  // Use centralized preferences hook
  const {
    availableThemes,
    availableFonts,
    currentTheme,
    currentFont,
    dynamicTextColor,
    setTheme,
    setFont,
    soundPackId,
    soundVolume,
    soundEnabled,
    setSoundPack,
    setSoundVolume,
    setSoundEnabled,
  } = useUserPreferences()

  // Load profile data (non-theme/font preferences)
  useEffect(() => {
    if (profile) {
      console.log("Settings - Loading profile data:", profile);
      console.log("Settings - Username from profile:", profile.username);
      setUsername(profile.username || "")
      setBio(profile.bio || "")
      setKeyboardSounds(profile.settings?.keyboardSounds ?? true)
      setVisualFeedback(profile.settings?.visualFeedback ?? true)
      setAutoSaveAiTests(profile.settings?.autoSaveAiTests ?? false)
    }
  }, [profile])

  const handleDeleteAccount = () => {
    console.log("[Settings] Delete account button clicked")
    setShowDeleteModal(true)
    setDeleteError("")
    setDeletePassword("")
    setDeleteConfirmation("")
  }

  const handleConfirmDeletion = async () => {
    if (!user || !user.email) {
      setDeleteError("User not authenticated")
      return
    }

    if (deleteConfirmation !== "DELETE") {
      setDeleteError("You must type 'DELETE' to confirm")
      return
    }

    // Detect auth provider
    const providerId = user.providerData[0]?.providerId || ""
    const isGoogleUser = providerId === "google.com"
    const isEmailUser = providerId === "password"

    // Only require password for email/password users
    if (isEmailUser && !deletePassword) {
      setDeleteError("Password is required")
      return
    }

    setIsDeleting(true)
    setDeleteError("")

    try {
      console.log(`[Settings] Re-authenticating user with provider: ${providerId}`)
      
      // Step 1: Re-authenticate based on provider
      if (isGoogleUser) {
        const provider = new GoogleAuthProvider()
        await reauthenticateWithPopup(user, provider)
        console.log("[Settings] Google re-authentication successful")
      } else if (isEmailUser) {
        const credential = EmailAuthProvider.credential(user.email, deletePassword)
        await reauthenticateWithCredential(user, credential)
        console.log("[Settings] Email/password re-authentication successful")
      } else {
        throw new Error(`Unsupported authentication provider: ${providerId}`)
      }

      // Step 2: Get fresh ID token (will have updated auth_time)
      const idToken = await user.getIdToken(true) // Force refresh
      
      console.log("[Settings] Got fresh ID token, calling delete API...")

      // Step 3: Call the delete account API
      const response = await fetch('/api/v1/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          confirmationText: deleteConfirmation,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete account')
      }

      console.log("[Settings] ✅ Account deleted successfully:", data)

      // Step 4: Sign out and redirect to homepage
      await auth.signOut()
      
      // Close modal and redirect
      setShowDeleteModal(false)
      router.push('/?message=account-deleted')

    } catch (error: any) {
      console.error("[Settings] ❌ Account deletion failed:", error)
      
      // Handle specific errors
      if (error.code === 'auth/wrong-password') {
        setDeleteError("Incorrect password. Please try again.")
      } else if (error.code === 'auth/too-many-requests') {
        setDeleteError("Too many failed attempts. Please try again later.")
      } else if (error.code === 'auth/popup-closed-by-user') {
        setDeleteError("Google authentication was cancelled. Please try again.")
      } else if (error.code === 'auth/popup-blocked') {
        setDeleteError("Popup was blocked. Please allow popups and try again.")
      } else if (error.message) {
        setDeleteError(error.message)
      } else {
        setDeleteError("An unexpected error occurred. Please try again.")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDeletion = () => {
    console.log("[Settings] Account deletion cancelled")
    setShowDeleteModal(false)
    setDeleteConfirmation("")
    setDeletePassword("")
    setDeleteError("")
  }

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    )
  }

  // Show message if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="text-center">
            <p className="text-muted-foreground">Please log in to access settings.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Settings</h1>
            <p className="text-lg text-muted-foreground">Customize your ZenType experience</p>
          </div>

          {/* Profile Settings Section */}
          <GlassCard className="space-y-6">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-[#00BFFF]" />
              <h2 className="text-2xl font-semibold text-foreground">Profile Settings</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground font-medium">
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="glass-card border-border bg-background/50 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-foreground font-medium">
                  Short Bio
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about your typing journey..."
                  rows={4}
                  className="glass-card border-border bg-background/50 text-foreground placeholder:text-muted-foreground resize-none"
                />
              </div>
            </div>
          </GlassCard>

          {/* Typing Area Themes Section */}
          <GlassCard className="space-y-6">
            <div className="flex items-center space-x-3">
              <Palette className="h-6 w-6 text-[#00BFFF]" />
              <h2 className="text-2xl font-semibold text-foreground">Typing Area Themes</h2>
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground">Choose a visual theme for your typing practice area</p>
              <div className={`p-6 rounded-lg bg-gradient-to-br ${currentTheme.gradient} border border-border`}>
                <p className="text-sm text-muted-foreground mb-2">Live Preview:</p>
                <p className={`text-lg ${currentFont.className} ${dynamicTextColor} leading-relaxed`}>
                  The quick brown fox jumps over the lazy dog. This is how your typing area will look.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {availableThemes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setTheme(theme.id)}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                      currentTheme.id === theme.id
                        ? "border-[#00BFFF] shadow-lg shadow-[#00BFFF]/20"
                        : "border-border hover:border-[#00BFFF]/50"
                    }`}
                  >
                    <div
                      className={`h-16 rounded-md bg-gradient-to-br ${theme.gradient} mb-3 flex items-center justify-center`}
                    >
                      <span className={`text-sm font-mono ${theme.textColor}`}>Sample Text</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Typing Font Selection Section */}
          <GlassCard className="space-y-6">
            <div className="flex items-center space-x-3">
              <Type className="h-6 w-6 text-[#00BFFF]" />
              <h2 className="text-2xl font-semibold text-foreground">Typing Font</h2>
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground">Select your preferred font (monospaced or decorative)</p>
              <Select value={currentFont.id} onValueChange={setFont}>
                <SelectTrigger className="w-48 h-9 glass-card border-border bg-background/50">
                  <SelectValue placeholder="Choose a font" />
                </SelectTrigger>
                <SelectContent className="glass-card border-border max-h-[300px]">
                  <div className="px-2 py-2 text-xs font-semibold text-muted-foreground">⌨️ Monospaced Fonts</div>
                  {availableFonts.filter(f => f.isMonospace).map((font) => (
                    <SelectItem key={font.id} value={font.id} className={`${font.className} py-2`}>
                      {font.name}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-2 text-xs font-semibold text-muted-foreground mt-2">🎨 Decorative Fonts</div>
                  {availableFonts.filter(f => !f.isMonospace).map((font) => (
                    <SelectItem key={font.id} value={font.id} className={`${font.className} py-2`}>
                      {font.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className={`p-6 glass-card border-border rounded-lg bg-gradient-to-br ${currentTheme.gradient}`}>
                <p className="text-sm text-muted-foreground mb-2">Font Preview:</p>
                <p className={`text-lg ${currentFont.className} ${dynamicTextColor} leading-relaxed`}>
                  The quick brown fox jumps over the lazy dog. 1234567890
                  <br />
                  <span className="text-green-500">Correct characters</span>{" "}
                  <span className="text-red-500">Incorrect characters</span>
                </p>
              </div>
            </div>
          </GlassCard>

          {/* General Settings Section */}
          <GlassCard className="space-y-6">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-6 w-6 text-[#00BFFF]" />
              <h2 className="text-2xl font-semibold text-foreground">General Settings</h2>
            </div>

            <div className="space-y-6">
              {/* Keyboard Sounds Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="keyboard-sounds" className="text-foreground font-medium">
                    Keyboard Sounds
                  </Label>
                  <p className="text-sm text-muted-foreground">Enable mechanical keyboard sound effects</p>
                </div>
                <Switch 
                  id="keyboard-sounds" 
                  checked={soundEnabled} 
                  onCheckedChange={setSoundEnabled} 
                />
              </div>

              {/* Sound Pack Selector (only shown when sounds are enabled) */}
              {soundEnabled && (
                <div className="space-y-3">
                  <Label htmlFor="sound-pack" className="text-foreground font-medium">
                    Sound Pack
                  </Label>
                  <Select value={soundPackId} onValueChange={setSoundPack}>
                    <SelectTrigger id="sound-pack" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOUND_PACKS.filter(pack => pack.id !== 'disabled').map((pack) => (
                        <SelectItem key={pack.id} value={pack.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{pack.name}</span>
                            <span className="text-xs text-muted-foreground">{pack.type} • {pack.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Volume Control (only shown when sounds are enabled) */}
              {soundEnabled && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sound-volume" className="text-foreground font-medium">
                      Volume
                    </Label>
                    <span className="text-sm text-muted-foreground">{Math.round(soundVolume * 100)}%</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <input
                      id="sound-volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={soundVolume}
                      onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="visual-feedback" className="text-foreground font-medium">
                    Visual Feedback
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show visual indicators for correct/incorrect keystrokes
                  </p>
                </div>
                <Switch 
                  id="visual-feedback" 
                  checked={visualFeedback} 
                  onCheckedChange={async (checked) => {
                    setVisualFeedback(checked)
                    // Save to user profile if user is logged in
                    if (user && profile) {
                      try {
                        await updateUserProfile(user.uid, { 
                          settings: { 
                            ...profile.settings, 
                            visualFeedback: checked 
                          } 
                        })
                        console.log("Visual feedback preference saved:", checked)
                      } catch (error) {
                        console.error("Error saving visual feedback preference:", error)
                      }
                    }
                  }} 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-save-ai-tests" className="text-foreground font-medium">
                    Auto-save AI-Generated Tests
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save tests you generate to the public library
                  </p>
                </div>
                <Switch 
                  id="auto-save-ai-tests" 
                  checked={autoSaveAiTests} 
                  onCheckedChange={async (checked) => {
                    setAutoSaveAiTests(checked)
                    // Save to user profile if user is logged in
                    if (user && profile) {
                      try {
                        await updateUserProfile(user.uid, { 
                          settings: { 
                            ...profile.settings, 
                            autoSaveAiTests: checked 
                          } 
                        })
                        console.log("Auto-save AI tests preference saved:", checked)
                      } catch (error) {
                        console.error("Error saving auto-save AI tests preference:", error)
                      }
                    }
                  }} 
                />
              </div>
            </div>
          </GlassCard>

          {/* Danger Zone Section */}
          <GlassCard className="space-y-6 border-destructive/20">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <h2 className="text-2xl font-semibold text-destructive">Danger Zone</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">Delete All Data</h3>
                <p className="text-muted-foreground">
                  This action cannot be undone. This will permanently delete your account and remove all your data from
                  our servers.
                </p>
              </div>

              <Button
                onClick={handleDeleteAccount}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold px-6 py-3 rounded-lg transition-all duration-300 hover:shadow-lg"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete My Account
              </Button>
            </div>
          </GlassCard>

          {/* Save Changes Button Section */}
          <div className="flex justify-center">
            <Button
              onClick={async () => {
                if (!user || !profile) {
                  console.log("User not logged in, cannot save profile changes")
                  return
                }

                setIsSaving(true)
                try {
                  await updateUserProfile(user.uid, {
                    username,
                    bio,
                    preferredThemeId: currentTheme.id,
                    preferredFontId: currentFont.id,
                    settings: {
                      keyboardSounds,
                      visualFeedback,
                      autoSaveAiTests,
                    },
                  })
                  console.log("Profile updated successfully")
                } catch (error) {
                  console.error("Error updating profile:", error)
                } finally {
                  setIsSaving(false)
                }
              }}
              disabled={isSaving || !user}
              className="bg-[#00BFFF] hover:bg-[#0099CC] text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <GlassCard className="max-w-md w-full space-y-6 border-destructive/20">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <h3 className="text-xl font-semibold text-foreground">Confirm Account Deletion</h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium mb-2">⚠️ This action cannot be undone!</p>
                  <p className="text-sm text-muted-foreground">
                    The following data will be permanently deleted:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                    <li>Your user profile and account information</li>
                    <li>All your typing test results and statistics</li>
                    <li>AI-generated tests you've created</li>
                    <li>Your preferences and settings</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-3">
                    🇪🇺 <span className="font-semibold">GDPR Compliant:</span> Data deletion completes within 24 hours
                  </p>
                </div>

                {/* Conditional authentication UI based on provider */}
                {user?.providerData[0]?.providerId === "password" && (
                  <div className="space-y-2">
                    <Label htmlFor="delete-password" className="text-foreground font-medium">
                      Enter your password to confirm:
                    </Label>
                    <Input
                      id="delete-password"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Your password"
                      className="glass-card border-border bg-background/50 text-foreground placeholder:text-muted-foreground"
                      disabled={isDeleting}
                    />
                  </div>
                )}

                {user?.providerData[0]?.providerId === "google.com" && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-400 font-medium mb-2">🔐 Google Account</p>
                    <p className="text-sm text-muted-foreground">
                      You'll be asked to re-authenticate with Google to confirm this deletion.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="delete-confirmation" className="text-foreground font-medium">
                    Type "DELETE" to confirm:
                  </Label>
                  <Input
                    id="delete-confirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE"
                    className="glass-card border-border bg-background/50 text-foreground placeholder:text-muted-foreground"
                    disabled={isDeleting}
                  />
                </div>

                {deleteError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{deleteError}</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleCancelDeletion}
                  variant="outline"
                  className="flex-1 border-border text-foreground hover:bg-accent bg-transparent"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDeletion}
                  disabled={
                    deleteConfirmation !== "DELETE" || 
                    (user?.providerData[0]?.providerId === "password" && !deletePassword) ||
                    isDeleting
                  }
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Deleting..." : "Confirm Deletion"}
                </Button>
              </div>
            </GlassCard>
          </div>
        )}
      </main>
    </div>
  )
}
