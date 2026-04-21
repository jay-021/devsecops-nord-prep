import type React from "react"
import { 
  Inter,
  Fira_Code,
  JetBrains_Mono,
  Source_Code_Pro,
  Roboto_Mono,
  Ubuntu_Mono,
  Playfair_Display,
  Lobster,
  Pacifico,
  Merriweather,
  Righteous
} from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/AuthProvider"
import { DebugProvider } from "@/context/DebugProvider"
import { EnhancedDebugPanel } from "@/components/debug/EnhancedDebugPanel"
import { CookieConsentBanner } from "@/components/privacy/cookie-consent-banner"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: 'swap' })

// Monospaced fonts for coding/serious typing
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-fira-code", display: 'swap' })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: 'swap' })
const sourceCodePro = Source_Code_Pro({ subsets: ["latin"], variable: "--font-source-code-pro", display: 'swap' })
const robotoMono = Roboto_Mono({ subsets: ["latin"], variable: "--font-roboto-mono", display: 'swap' })
const ubuntuMono = Ubuntu_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-ubuntu-mono", display: 'swap' })

// Decorative fonts for fun/stylistic typing
const playfairDisplay = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair-display", display: 'swap' })
const lobster = Lobster({ subsets: ["latin"], weight: "400", variable: "--font-lobster", display: 'swap' })
const pacifico = Pacifico({ subsets: ["latin"], weight: "400", variable: "--font-pacifico", display: 'swap' })
const merriweather = Merriweather({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-merriweather", display: 'swap' })
const righteous = Righteous({ subsets: ["latin"], weight: "400", variable: "--font-righteous", display: 'swap' })

export const metadata = {
  title: "ZenType - Find Your Flow. Master Your Typing.",
  description: "A modern, AI-powered typing platform designed for focus, improvement, and seamless practice.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${firaCode.variable} ${jetbrainsMono.variable} ${sourceCodePro.variable} ${robotoMono.variable} ${ubuntuMono.variable} ${playfairDisplay.variable} ${lobster.variable} ${pacifico.variable} ${merriweather.variable} ${righteous.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <DebugProvider>
            <AuthProvider>
              {children}
              <EnhancedDebugPanel />
              <CookieConsentBanner />
            </AuthProvider>
          </DebugProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
