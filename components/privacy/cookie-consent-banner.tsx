"use client"

import { useState, useEffect } from "react"
import { X, Cookie, Shield, BarChart3, Settings as SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthProvider"

interface ConsentPreferences {
  analytics: boolean
  functional: boolean
  advertising: boolean
}

/**
 * Cookie Consent Banner Component
 * 
 * GDPR-compliant cookie consent following CookieYes best practices:
 * - Appears on first visit
 * - Granular control by category
 * - Strictly necessary cookies cannot be disabled
 * - Clear explanations for each category
 * - Easy to accept all or customize
 * - Stores preferences in Firestore
 * - Can be reopened from settings
 */
export function CookieConsentBanner() {
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [consents, setConsents] = useState<ConsentPreferences>({
    analytics: false,
    functional: false,
    advertising: false,
  })

  // Check if user has already given consent
  useEffect(() => {
    const consentGiven = localStorage.getItem('zentype_cookie_consent')
    if (!consentGiven) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAcceptAll = async () => {
    const allConsents: ConsentPreferences = {
      analytics: true,
      functional: true,
      advertising: false, // Not used currently
    }
    
    await saveConsents(allConsents)
  }

  const handleAcceptNecessary = async () => {
    const necessaryOnly: ConsentPreferences = {
      analytics: false,
      functional: false,
      advertising: false,
    }
    
    await saveConsents(necessaryOnly)
  }

  const handleSaveCustom = async () => {
    await saveConsents(consents)
  }

  const saveConsents = async (preferences: ConsentPreferences) => {
    setIsSaving(true)
    
    try {
      // Save to localStorage immediately
      localStorage.setItem('zentype_cookie_consent', 'true')
      localStorage.setItem('zentype_cookie_preferences', JSON.stringify(preferences))
      
      // If user is logged in, save to Firestore
      if (user) {
        const idToken = await user.getIdToken()
        
        const response = await fetch('/api/v1/user/consents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify(preferences),
        })

        if (!response.ok) {
          console.error('[CookieConsent] Failed to save consents to server')
        } else {
          console.log('[CookieConsent] ✅ Consents saved to server')
        }
      }
      
      // Hide banner
      setIsVisible(false)
      
      // Dispatch custom event for other components to react to consent changes
      window.dispatchEvent(new CustomEvent('consentUpdated', { detail: preferences }))
      
    } catch (error) {
      console.error('[CookieConsent] Error saving consents:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-4xl mx-auto border-2 border-[#00BFFF]/30 shadow-2xl rounded-2xl backdrop-blur-xl bg-white dark:bg-black/95">
        {!showCustomize ? (
          // Simple View
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Cookie className="h-6 w-6 text-[#00BFFF]" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    🍪 We use cookies
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    We use cookies to improve your experience, analyze site traffic, and personalize content. 
                    You can choose which cookies to accept.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleAcceptAll}
                disabled={isSaving}
                className="flex-1 bg-[#00BFFF] hover:bg-[#0099CC] text-white font-semibold"
              >
                {isSaving ? "Saving..." : "Accept All"}
              </Button>
              <Button
                onClick={handleAcceptNecessary}
                disabled={isSaving}
                variant="outline"
                className="flex-1 border-border bg-transparent"
              >
                {isSaving ? "Saving..." : "Necessary Only"}
              </Button>
              <Button
                onClick={() => setShowCustomize(true)}
                disabled={isSaving}
                variant="outline"
                className="flex-1 border-border bg-transparent"
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Customize
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              By clicking "Accept All", you agree to our use of cookies. Learn more in our{" "}
              <a href="/privacy-policy" className="text-[#00BFFF] hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        ) : (
          // Detailed View
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cookie className="h-6 w-6 text-[#00BFFF]" />
                <h3 className="text-lg font-semibold text-foreground">
                  Cookie Preferences
                </h3>
              </div>
              <button
                onClick={() => setShowCustomize(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Strictly Necessary */}
              <div className="p-4 rounded-lg border border-border bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-[#00BFFF]" />
                    <Label className="text-base font-medium cursor-pointer">
                      Strictly Necessary
                    </Label>
                  </div>
                  <Switch checked={true} disabled className="opacity-50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Required for the website to function. These cookies enable core functionality like authentication and session management.
                  <span className="block mt-1 text-xs">
                    ℹ️ Cannot be disabled as they are essential for the site to work.
                  </span>
                </p>
              </div>

              {/* Analytics */}
              <div className="p-4 rounded-lg border border-border bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#00BFFF]" />
                    <Label htmlFor="analytics" className="text-base font-medium cursor-pointer">
                      Analytics Cookies
                    </Label>
                  </div>
                  <Switch
                    id="analytics"
                    checked={consents.analytics}
                    onCheckedChange={(checked) => setConsents({ ...consents, analytics: checked })}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Help us understand how you use our site so we can improve performance and user experience.
                  <span className="block mt-1 text-xs text-muted-foreground">
                    📊 Examples: Google Analytics, performance monitoring
                  </span>
                </p>
              </div>

              {/* Functional */}
              <div className="p-4 rounded-lg border border-border bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5 text-[#00BFFF]" />
                    <Label htmlFor="functional" className="text-base font-medium cursor-pointer">
                      Functional Cookies
                    </Label>
                  </div>
                  <Switch
                    id="functional"
                    checked={consents.functional}
                    onCheckedChange={(checked) => setConsents({ ...consents, functional: checked })}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Remember your preferences and settings to provide a personalized experience.
                  <span className="block mt-1 text-xs text-muted-foreground">
                    🎨 Examples: Theme preferences, language selection, feature settings
                  </span>
                </p>
              </div>

              {/* Advertising (currently not used) */}
              <div className="p-4 rounded-lg border border-border bg-background/50 opacity-60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cookie className="h-5 w-5 text-muted-foreground" />
                    <Label className="text-base font-medium text-muted-foreground">
                      Advertising Cookies
                    </Label>
                  </div>
                  <Switch checked={false} disabled className="opacity-50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Currently not used. If enabled in the future, would be used to show relevant ads.
                  <span className="block mt-1 text-xs text-muted-foreground">
                    🚫 Not applicable - We don't show ads
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleSaveCustom}
                disabled={isSaving}
                className="flex-1 bg-[#00BFFF] hover:bg-[#0099CC] text-white font-semibold"
              >
                {isSaving ? "Saving..." : "Save Preferences"}
              </Button>
              <Button
                onClick={() => setShowCustomize(false)}
                disabled={isSaving}
                variant="outline"
                className="flex-1 border-border bg-transparent"
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              🇪🇺 <span className="font-semibold">GDPR Compliant</span> - You can change these preferences anytime in Settings → Privacy
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
