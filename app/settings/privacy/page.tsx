"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Shield, Download, Cookie, BarChart3, Settings as SettingsIcon, FileText } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import Link from "next/link"

interface ConsentPreferences {
  analytics: boolean
  functional: boolean
  advertising: boolean
}

export default function PrivacySettingsPage() {
  const { user, isLoading } = useAuth()
  const [consents, setConsents] = useState<ConsentPreferences>({
    analytics: false,
    functional: false,
    advertising: false,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingConsents, setIsLoadingConsents] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load current consents
  useEffect(() => {
    if (user) {
      loadConsents()
    } else {
      // Load from localStorage if not logged in
      const storedPrefs = localStorage.getItem('zentype_cookie_preferences')
      if (storedPrefs) {
        try {
          setConsents(JSON.parse(storedPrefs))
        } catch (e) {
          console.error('[PrivacySettings] Failed to parse stored preferences')
        }
      }
      setIsLoadingConsents(false)
    }
  }, [user])

  const loadConsents = async () => {
    if (!user) return

    try {
      const idToken = await user.getIdToken()
      const response = await fetch('/api/v1/user/consents', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.consents) {
          setConsents({
            analytics: data.consents.analytics?.granted || false,
            functional: data.consents.functional?.granted || false,
            advertising: data.consents.advertising?.granted || false,
          })
        }
      }
    } catch (error) {
      console.error('[PrivacySettings] Error loading consents:', error)
    } finally {
      setIsLoadingConsents(false)
    }
  }

  const handleSaveConsents = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      // Save to localStorage
      localStorage.setItem('zentype_cookie_preferences', JSON.stringify(consents))
      
      // If logged in, save to server
      if (user) {
        const idToken = await user.getIdToken()
        const response = await fetch('/api/v1/user/consents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify(consents),
        })

        if (!response.ok) {
          throw new Error('Failed to save consents')
        }
      }

      setMessage({ type: 'success', text: '✅ Privacy preferences saved successfully' })
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('consentUpdated', { detail: consents }))
    } catch (error) {
      console.error('[PrivacySettings] Error saving consents:', error)
      setMessage({ type: 'error', text: '❌ Failed to save preferences. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportData = async () => {
    if (!user) {
      setMessage({ type: 'error', text: 'You must be logged in to export your data' })
      return
    }

    setIsExporting(true)
    setMessage(null)

    try {
      const idToken = await user.getIdToken()
      const response = await fetch('/api/v1/user/export-data', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      // Download the JSON file
      const data = await response.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zentype-data-export-${user.uid}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: '✅ Data exported successfully' })
    } catch (error) {
      console.error('[PrivacySettings] Error exporting data:', error)
      setMessage({ type: 'error', text: '❌ Failed to export data. Please try again.' })
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading || isLoadingConsents) {
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Privacy & Data</h1>
            <p className="text-lg text-muted-foreground">
              Manage your data and privacy preferences
            </p>
            <p className="text-sm text-muted-foreground">
              🇪🇺 <span className="font-semibold">GDPR Compliant</span> - You have full control over your data
            </p>
          </div>

          {/* Message Alert */}
          {message && (
            <div className={`p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {/* Cookie Consent Management */}
          <GlassCard className="space-y-6">
            <div className="flex items-center space-x-3">
              <Cookie className="h-6 w-6 text-[#00BFFF]" />
              <h2 className="text-2xl font-semibold text-foreground">Cookie Preferences</h2>
            </div>

            <div className="space-y-4">
              {/* Strictly Necessary */}
              <div className="p-4 rounded-lg border border-border bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-[#00BFFF]" />
                    <Label className="text-base font-medium">
                      Strictly Necessary Cookies
                    </Label>
                  </div>
                  <Switch checked={true} disabled className="opacity-50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Required for authentication and core functionality. Cannot be disabled.
                </p>
              </div>

              {/* Analytics */}
              <div className="p-4 rounded-lg border border-border bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#00BFFF]" />
                    <Label htmlFor="analytics-switch" className="text-base font-medium cursor-pointer">
                      Analytics Cookies
                    </Label>
                  </div>
                  <Switch
                    id="analytics-switch"
                    checked={consents.analytics}
                    onCheckedChange={(checked) => setConsents({ ...consents, analytics: checked })}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Help us improve by tracking performance and usage patterns.
                </p>
              </div>

              {/* Functional */}
              <div className="p-4 rounded-lg border border-border bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5 text-[#00BFFF]" />
                    <Label htmlFor="functional-switch" className="text-base font-medium cursor-pointer">
                      Functional Cookies
                    </Label>
                  </div>
                  <Switch
                    id="functional-switch"
                    checked={consents.functional}
                    onCheckedChange={(checked) => setConsents({ ...consents, functional: checked })}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Remember your preferences like theme and language.
                </p>
              </div>
            </div>

            <Button
              onClick={handleSaveConsents}
              disabled={isSaving}
              className="w-full bg-[#00BFFF] hover:bg-[#0099CC] text-white font-semibold"
            >
              {isSaving ? "Saving..." : "Save Cookie Preferences"}
            </Button>
          </GlassCard>

          {/* Data Rights */}
          <GlassCard className="space-y-6">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-[#00BFFF]" />
              <h2 className="text-2xl font-semibold text-foreground">Your Data Rights</h2>
            </div>

            <div className="space-y-4">
              {/* Export Data */}
              <div className="p-4 rounded-lg border border-border bg-background/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-foreground mb-1">
                      Export Your Data
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Download all your personal data in JSON format (GDPR Article 15 - Right to Access)
                    </p>
                  </div>
                  <Button
                    onClick={handleExportData}
                    disabled={isExporting || !user}
                    variant="outline"
                    className="ml-4"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? "Exporting..." : "Export"}
                  </Button>
                </div>
              </div>

              {/* Delete Account */}
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-foreground mb-1">
                      Delete Your Account
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data (GDPR Article 17 - Right to Erasure)
                    </p>
                  </div>
                  <Link href="/settings">
                    <Button
                      variant="outline"
                      className="ml-4 border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      Go to Settings
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Privacy Policy */}
              <div className="p-4 rounded-lg border border-border bg-background/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-foreground mb-1">
                      Privacy Policy
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Read our complete privacy policy and data processing information
                    </p>
                  </div>
                  <Link href="/privacy-policy">
                    <Button variant="outline" className="ml-4">
                      <FileText className="h-4 w-4 mr-2" />
                      View Policy
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* GDPR Rights Information */}
          <GlassCard className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Your Rights Under GDPR</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">✅ Right to Access</p>
                <p className="text-xs text-muted-foreground">Export your data anytime</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">✅ Right to Rectification</p>
                <p className="text-xs text-muted-foreground">Edit your profile in Settings</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">✅ Right to Erasure</p>
                <p className="text-xs text-muted-foreground">Delete your account</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">✅ Right to Data Portability</p>
                <p className="text-xs text-muted-foreground">Download in JSON format</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">✅ Right to Object</p>
                <p className="text-xs text-muted-foreground">Manage cookie consents</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">✅ Right to Withdraw Consent</p>
                <p className="text-xs text-muted-foreground">Change preferences anytime</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  )
}
