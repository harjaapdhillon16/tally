"use client";

import { ChevronDown, Shield, Target, Zap } from "lucide-react";
import { WaitlistForm } from "./waitlist-form";

/**
 * Hero section for landing page
 * Features centered text layout with bold tagline, value proposition, and inline waitlist form
 * Beluga-style: No dashboard preview, text-focused with purple glow effect
 */
export function HeroSection() {
  const handleScrollToFeatures = () => {
    const featuresSection = document.getElementById("features");
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen pt-32 pb-16 bg-background">
      {/* Purple glow effect */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_50%_-10%,hsl(var(--primary)/0.15),transparent)]" />
      
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Big Bold Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Bookkeeping that doesn't suck
          </h1>
          
          {/* Supporting Text */}
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Real-time P&L, automated COGS tracking, and tax-ready exports. Built for Shopify stores.
          </p>
          
          {/* Waitlist Form */}
          <div className="max-w-md mx-auto mb-8">
            <WaitlistForm inline />
          </div>
          
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span>95%+ Accuracy</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>Powered by Gemini</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <button
          onClick={handleScrollToFeatures}
          className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
          aria-label="Scroll to features"
        >
          <span className="text-sm">Explore Features</span>
          <ChevronDown className="w-5 h-5 animate-bounce group-hover:text-primary" />
        </button>
      </div>
    </section>
  );
}
