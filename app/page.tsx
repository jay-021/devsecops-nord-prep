import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { Header } from "@/components/header"
import { TrendingUp, Sparkles, Target, LineChart } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 mb-20">
          <h1 className="text-6xl md:text-7xl font-bold text-foreground text-balance leading-tight">
            Find Your Flow. <span className="text-[#00BFFF]">Master Your Typing.</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
            ZenType is a modern, AI-powered typing platform designed for focus, improvement, and seamless practice.
          </p>

          <Link href="/test">
            <Button
              size="lg"
              className="bg-[#00BFFF] hover:bg-[#0099CC] text-white text-xl px-8 py-4 h-auto rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-0"
            >
              Begin Your Practice
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          <GlassCard className="text-center space-y-6 group">
            <div className="w-16 h-16 bg-[#00BFFF] rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Smart Practice</h3>
            <p className="text-muted-foreground leading-relaxed">
              Adaptive typing tests that adjust to your skill level!
            </p>
          </GlassCard>

          <GlassCard className="text-center space-y-6 group">
            <div className="w-16 h-16 bg-[#00BFFF] rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">AI-Powered</h3>
            <p className="text-muted-foreground leading-relaxed">Generate custom typing content with AI!</p>
          </GlassCard>

          <GlassCard className="text-center space-y-6 group">
            <div className="w-16 h-16 bg-[#00BFFF] rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
              <Target className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Precision Focus</h3>
            <p className="text-muted-foreground leading-relaxed">Track accuracy and improve with detailed analytics!</p>
          </GlassCard>

          <GlassCard className="text-center space-y-6 group">
            <div className="w-16 h-16 bg-[#00BFFF] rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
              <LineChart className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Progress Tracking</h3>
            <p className="text-muted-foreground leading-relaxed">Monitor your improvement over time!</p>
          </GlassCard>
        </div>

        <GlassCard className="text-center space-y-8 max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-white">Ready to improve your typing?</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Join thousands of users who have already improved their typing speed and accuracy with ZenType.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button className="bg-[#00BFFF] hover:bg-[#0099CC] text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-0">
                Create Account
              </Button>
            </Link>
            <Link href="/test">
              <Button
                variant="outline"
                className="border-2 border-[#00BFFF] text-[#00BFFF] hover:bg-[#00BFFF] hover:text-white bg-background px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-[#00BFFF]/20"
              >
                Try as Guest
              </Button>
            </Link>
          </div>
        </GlassCard>
      </main>
    </div>
  )
}
