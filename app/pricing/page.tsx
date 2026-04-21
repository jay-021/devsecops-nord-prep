"use client"

import React from 'react';
import { Header } from "@/components/header";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Check, Zap, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";

export default function PricingPage() {
  const { user } = useAuth();
  
  const freeFeatures = [
    "Unlimited practice tests",
    "5 AI-generated tests per day",
    "Leaderboard access",
    "Profile customization",
    "Performance analytics",
    "Multiple typing themes",
    "Keyboard sound packs"
  ];
  
  const premiumFeatures = [
    "Everything in Free",
    "Unlimited AI-generated tests",
    "Priority support",
    "Advanced analytics",
    "Custom themes (coming soon)",
    "Ad-free experience",
    "Early access to new features"
  ];
  
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start with our free tier and upgrade anytime for unlimited AI test generation
            </p>
          </div>
          
          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier Card */}
            <GlassCard className="p-8 border-2 border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-accent">
                  <Zap className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Free</h2>
                  <p className="text-sm text-muted-foreground">Perfect for getting started</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-foreground">$0</span>
                  <span className="text-lg text-muted-foreground">/month</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-8">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                variant="outline" 
                className="w-full border-border text-foreground"
                disabled
              >
                {user ? "Current Plan" : "Sign Up Free"}
              </Button>
            </GlassCard>
            
            {/* Premium Tier Card */}
            <GlassCard className="p-8 border-2 border-primary relative overflow-hidden">
              {/* Premium Badge */}
              <div className="absolute top-4 right-4">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  ✨ PREMIUM
                </div>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600/20 to-blue-600/20">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Premium</h2>
                  <p className="text-sm text-muted-foreground">Unlock your full potential</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-foreground">$3</span>
                  <span className="text-lg text-muted-foreground">/month</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  or <span className="font-semibold text-foreground">$30/year</span> (save 17%)
                </div>
              </div>
              
              <ul className="space-y-3 mb-8">
                {premiumFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                onClick={() => {
                  if (!user) {
                    alert('Please sign in to upgrade to Premium');
                    window.location.href = '/login';
                  } else {
                    alert('Premium subscription coming soon! Payment integration with Stripe is in development.');
                  }
                }}
              >
                {user ? "Upgrade to Premium" : "Sign In to Upgrade"}
              </Button>
            </GlassCard>
          </div>
          
          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  What happens when I reach my daily AI test limit?
                </h3>
                <p className="text-muted-foreground">
                  Free tier users get 5 AI-generated tests per day (resets at midnight UTC). 
                  Once you reach the limit, you can still use unlimited practice tests or upgrade 
                  to Premium for unlimited AI test generation.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Can I cancel my Premium subscription anytime?
                </h3>
                <p className="text-muted-foreground">
                  Yes! You can cancel your Premium subscription at any time. You'll keep Premium 
                  features until the end of your billing period.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  What's the difference between practice tests and AI tests?
                </h3>
                <p className="text-muted-foreground">
                  Practice tests are pre-made tests with curated content. AI tests are generated 
                  on-demand by AI based on your chosen topic and difficulty, giving you unlimited 
                  variety (Premium users only).
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Is payment information required for the free tier?
                </h3>
                <p className="text-muted-foreground">
                  No! The free tier requires no payment information. Just sign up with your email 
                  or Google account and start typing immediately.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  How do I get support?
                </h3>
                <p className="text-muted-foreground">
                  Free tier users can access community support through our GitHub issues. Premium 
                  users get priority email support with faster response times.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
