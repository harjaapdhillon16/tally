# Nexus UI Redesign: Notion-Inspired Minimalist Design

**Status**: In Progress  
**Start Date**: September 29, 2025  
**Target**: Complete transformation to clean, minimalist, Notion-style financial dashboard

---

## Table of Contents

1. [Overview & Goals](#overview--goals)
2. [Design Principles](#design-principles)
3. [Technical Stack](#technical-stack)
4. [Design System Specifications](#design-system-specifications)
5. [Phase 1: Foundation - Design System Updates](#phase-1-foundation---design-system-updates)
6. [Phase 2: Layout Architecture](#phase-2-layout-architecture)
7. [Phase 3: Component-Level Updates](#phase-3-component-level-updates)
8. [Phase 4: Transactions Table Overhaul](#phase-4-transactions-table-overhaul)
9. [Phase 5: Review Queue Redesign](#phase-5-review-queue-redesign)
10. [Phase 6: UI Component Library Updates](#phase-6-ui-component-library-updates)
11. [Phase 7: New Components](#phase-7-new-components)
12. [Phase 8: Responsive Design](#phase-8-responsive-design)
13. [Additional Enhancements](#additional-enhancements)
14. [Implementation Order](#implementation-order)
15. [File Inventory](#file-inventory)
16. [Technical Specifications](#technical-specifications)
17. [Testing Checklist](#testing-checklist)

---

## Overview & Goals

### Vision
Transform Nexus into a clean, minimalist web app for e-commerce financial management, inspired by Notion's interface design. Prioritize simplicity, clarity, and trust through an intuitive interface optimized for financial data.

### Key Objectives
- **Simplicity**: Remove visual clutter, emphasize content over chrome
- **Clarity**: Make financial data easy to scan and understand
- **Trust**: Professional, reliable aesthetic for financial applications
- **Efficiency**: Support keyboard shortcuts and quick actions
- **Accessibility**: Maintain WCAG 2.1 AA compliance
- **Responsiveness**: Optimize for both desktop and mobile experiences
- **Dark Mode Ready**: Build with dark mode support in mind from day one

### Design Inspiration
- Notion (primary reference for UI patterns)
- Linear (dashboard and data visualization)
- Height (clean interface patterns)
- Plane (minimal project management UI)

---

## Design Principles

1. **White Space is King**: Generous spacing creates breathing room
2. **Subtle Over Bold**: Minimal borders, soft shadows, muted colors
3. **Content First**: UI chrome should fade into background
4. **Consistent Spacing**: Strict 8pt grid system (8px, 16px, 24px, 32px...)
5. **Purposeful Color**: Use color sparingly for meaning, not decoration
6. **Fast & Responsive**: Smooth animations (150ms), instant feedback
7. **Progressive Disclosure**: Show what's needed, hide complexity
8. **Keyboard Friendly**: Support power users with shortcuts

---

## Technical Stack

### Current Stack (Maintained)
- **Framework**: Next.js 15.5.0 with React 19.1.0
- **Styling**: Tailwind CSS 3.4.0
- **Components**: Radix UI primitives via shadcn/ui
- **Icons**: Lucide React 0.541.0
- **State**: React Query (TanStack Query)
- **TypeScript**: v5

### Design System Additions
- **Font**: Inter (replacing Geist Sans/Mono)
- **Color System**: Notion-inspired palette (light + dark modes)
- **Animation**: Tailwind CSS Animate + custom transitions
- **CSS Variables**: HSL-based for easy theming

---

## Design System Specifications

### Typography

#### Font Stack
```typescript
// Primary: Inter
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

// Monospace (for code/data): JetBrains Mono or SF Mono
font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace
```

#### Type Scale
```css
/* Headers */
h1: 32px / 2rem - font-weight: 700 - line-height: 1.2 - letter-spacing: -0.02em
h2: 24px / 1.5rem - font-weight: 600 - line-height: 1.3 - letter-spacing: -0.01em
h3: 20px / 1.25rem - font-weight: 600 - line-height: 1.4 - letter-spacing: -0.01em
h4: 16px / 1rem - font-weight: 600 - line-height: 1.5 - letter-spacing: 0

/* Body */
body: 14px / 0.875rem - font-weight: 400 - line-height: 1.6
small: 12px / 0.75rem - font-weight: 400 - line-height: 1.5
tiny: 11px / 0.6875rem - font-weight: 400 - line-height: 1.4

/* UI Labels */
label: 12px / 0.75rem - font-weight: 500 - line-height: 1.4 - text-transform: uppercase - letter-spacing: 0.05em
```

### Color Palette

#### Light Mode (Primary Focus)
```css
/* Base */
--background: 0 0% 100%                    /* #FFFFFF - Pure white */
--foreground: 24 10% 20%                   /* #37352F - Notion's text color */

/* Cards & Surfaces */
--card: 0 0% 98%                           /* #FAFAFA - Subtle off-white */
--card-foreground: 24 10% 20%              /* #37352F */

/* Muted/Secondary */
--muted: 40 13% 95%                        /* #F7F6F3 - Light warm gray */
--muted-foreground: 24 5% 50%              /* #7C7A77 - Medium gray */
--muted-lighter: 40 13% 97%                /* #FBFBFA - Lighter warm gray */

/* Borders & Dividers */
--border: 40 13% 91%                       /* #E9E9E7 - Very subtle border */
--border-subtle: 40 13% 93%                /* #EDECE9 - Even more subtle */

/* Interactive/Accent */
--primary: 210 100% 50%                    /* #2383E2 - Notion blue */
--primary-foreground: 0 0% 100%            /* White text on blue */
--accent: 210 100% 96%                     /* #E3F2FD - Light blue background */
--accent-foreground: 210 100% 40%          /* Dark blue text */

/* Semantic Colors */
--success: 142 71% 45%                     /* #22C55E - Green */
--success-background: 142 71% 95%          /* Light green */
--warning: 38 92% 50%                      /* #F59E0B - Amber */
--warning-background: 38 92% 95%           /* Light amber */
--destructive: 0 84% 60%                   /* #EF4444 - Red */
--destructive-background: 0 84% 95%        /* Light red */

/* Category Pills - Tier 1 */
--revenue-bg: 210 100% 96%                 /* #E3F2FD - Light blue */
--revenue-fg: 210 100% 35%                 /* #0D47A1 - Dark blue */
--cogs-bg: 33 100% 96%                     /* #FFE9D6 - Light orange */
--cogs-fg: 33 100% 30%                     /* #E65100 - Dark orange */
--opex-bg: 270 100% 97%                    /* #F3E8FF - Light purple */
--opex-fg: 270 100% 35%                    /* #6B21A8 - Dark purple */

/* Confidence Tags */
--confidence-high-bg: 142 71% 95%          /* Light green */
--confidence-high-fg: 142 71% 35%          /* Dark green */
--confidence-medium-bg: 48 96% 95%         /* Light yellow */
--confidence-medium-fg: 48 96% 30%         /* Dark yellow/gold */
--confidence-low-bg: 0 84% 95%             /* Light red */
--confidence-low-fg: 0 84% 45%             /* Dark red */
```

#### Dark Mode (Future-Ready)
```css
/* Base */
--background: 220 15% 12%                  /* #1C1F26 - Dark blue-gray */
--foreground: 0 0% 95%                     /* #F2F2F2 - Off-white */

/* Cards & Surfaces */
--card: 220 15% 15%                        /* #23262E - Slightly lighter */
--card-foreground: 0 0% 95%                /* #F2F2F2 */

/* Muted/Secondary */
--muted: 220 15% 20%                       /* #2E3139 - Medium gray */
--muted-foreground: 220 10% 65%            /* #9CA3AF - Light gray */

/* Borders */
--border: 220 15% 25%                      /* #373B45 - Subtle border */
--border-subtle: 220 15% 22%               /* #303339 */

/* Interactive */
--primary: 210 100% 55%                    /* Brighter blue for dark mode */
--primary-foreground: 0 0% 100%
--accent: 210 100% 20%                     /* Darker blue background */
--accent-foreground: 210 100% 70%          /* Light blue text */

/* Note: All semantic and category colors adjusted for dark mode contrast */
```

### Spacing Scale (8pt Grid)
```css
0.5: 4px   / 0.25rem
1:   8px   / 0.5rem   /* Base unit */
1.5: 12px  / 0.75rem
2:   16px  / 1rem     /* Common spacing */
3:   24px  / 1.5rem
4:   32px  / 2rem
5:   40px  / 2.5rem
6:   48px  / 3rem
8:   64px  / 4rem
10:  80px  / 5rem
12:  96px  / 6rem
```

### Border Radius
```css
--radius-sm: 4px     /* Small elements, badges */
--radius-md: 6px     /* Buttons, inputs */
--radius-lg: 8px     /* Cards, modals */
--radius-xl: 12px    /* Large containers */
--radius-full: 9999px /* Pills, avatars */
```

### Shadows
```css
/* Minimal shadows - Notion-style */
--shadow-sm: 0 1px 2px rgba(15, 15, 15, 0.03)
--shadow-md: 0 1px 3px rgba(15, 15, 15, 0.06)
--shadow-lg: 0 2px 8px rgba(15, 15, 15, 0.08)
--shadow-xl: 0 3px 12px rgba(15, 15, 15, 0.1)
--shadow-hover: 0 4px 16px rgba(15, 15, 15, 0.12)

/* Dark mode shadows - deeper, more pronounced */
--shadow-dark-sm: 0 1px 2px rgba(0, 0, 0, 0.2)
--shadow-dark-md: 0 2px 4px rgba(0, 0, 0, 0.3)
--shadow-dark-lg: 0 4px 12px rgba(0, 0, 0, 0.4)
```

### Transitions
```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Phase 1: Foundation - Design System Updates

### 1.1 Typography & Font Changes

**Goal**: Replace Geist fonts with Inter for better readability and Notion consistency.

#### Files to Modify
1. `apps/web/src/app/layout.tsx`
2. `apps/web/tailwind.config.ts`
3. `apps/web/package.json` (if installing Inter via npm)

#### Implementation Steps

**Step 1**: Update `layout.tsx`
```typescript
// Remove:
import { Geist, Geist_Mono } from "next/font/google";

// Add:
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

// Update body className
<body className={`${inter.variable} ${jetbrainsMono.variable} antialiased font-sans`}>
```

**Step 2**: Update `tailwind.config.ts`
```typescript
fontFamily: {
  sans: ["var(--font-inter)", "sans-serif"],
  mono: ["var(--font-jetbrains-mono)", "monospace"],
},
```

### 1.2 Color Palette Implementation

**Goal**: Implement Notion-inspired color system with dark mode support.

#### Files to Modify
1. `apps/web/src/app/globals.css`

#### Implementation

**Update globals.css** - Replace entire `:root` and dark mode sections:
```css
@layer base {
  :root {
    /* Base */
    --background: 0 0% 100%;
    --foreground: 24 10% 20%;

    /* Cards & Surfaces */
    --card: 0 0% 98%;
    --card-foreground: 24 10% 20%;

    /* Popovers & Menus */
    --popover: 0 0% 100%;
    --popover-foreground: 24 10% 20%;

    /* Interactive */
    --primary: 210 100% 50%;
    --primary-foreground: 0 0% 100%;
    
    /* Secondary (less prominent actions) */
    --secondary: 40 13% 95%;
    --secondary-foreground: 24 10% 20%;

    /* Muted backgrounds and text */
    --muted: 40 13% 95%;
    --muted-foreground: 24 5% 50%;
    --muted-lighter: 40 13% 97%;

    /* Accent (hover states, highlights) */
    --accent: 210 100% 96%;
    --accent-foreground: 210 100% 40%;

    /* Destructive actions */
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --destructive-background: 0 84% 95%;

    /* Success states */
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --success-background: 142 71% 95%;

    /* Warning states */
    --warning: 38 92% 50%;
    --warning-foreground: 24 10% 20%;
    --warning-background: 38 92% 95%;

    /* Borders & Inputs */
    --border: 40 13% 91%;
    --border-subtle: 40 13% 93%;
    --input: 40 13% 91%;
    --ring: 210 100% 50%;

    /* Category Pills - Tier 1 */
    --revenue-bg: 210 100% 96%;
    --revenue-fg: 210 100% 35%;
    --cogs-bg: 33 100% 96%;
    --cogs-fg: 33 100% 30%;
    --opex-bg: 270 100% 97%;
    --opex-fg: 270 100% 35%;

    /* Confidence Tags */
    --confidence-high-bg: 142 71% 95%;
    --confidence-high-fg: 142 71% 35%;
    --confidence-medium-bg: 48 96% 95%;
    --confidence-medium-fg: 48 96% 30%;
    --confidence-low-bg: 0 84% 95%;
    --confidence-low-fg: 0 84% 45%;

    /* Border Radius */
    --radius: 8px;
    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 8px;
    --radius-xl: 12px;
  }

  .dark {
    /* Base */
    --background: 220 15% 12%;
    --foreground: 0 0% 95%;

    /* Cards & Surfaces */
    --card: 220 15% 15%;
    --card-foreground: 0 0% 95%;

    /* Popovers */
    --popover: 220 15% 15%;
    --popover-foreground: 0 0% 95%;

    /* Interactive */
    --primary: 210 100% 55%;
    --primary-foreground: 0 0% 100%;

    /* Secondary */
    --secondary: 220 15% 20%;
    --secondary-foreground: 0 0% 95%;

    /* Muted */
    --muted: 220 15% 20%;
    --muted-foreground: 220 10% 65%;

    /* Accent */
    --accent: 210 100% 20%;
    --accent-foreground: 210 100% 70%;

    /* Destructive */
    --destructive: 0 84% 55%;
    --destructive-foreground: 0 0% 100%;
    --destructive-background: 0 84% 20%;

    /* Success */
    --success: 142 71% 50%;
    --success-foreground: 0 0% 100%;
    --success-background: 142 71% 20%;

    /* Warning */
    --warning: 38 92% 55%;
    --warning-foreground: 24 10% 10%;
    --warning-background: 38 92% 20%;

    /* Borders */
    --border: 220 15% 25%;
    --border-subtle: 220 15% 22%;
    --input: 220 15% 25%;
    --ring: 210 100% 55%;

    /* Category Pills - adjusted for dark mode */
    --revenue-bg: 210 100% 20%;
    --revenue-fg: 210 100% 75%;
    --cogs-bg: 33 100% 20%;
    --cogs-fg: 33 100% 75%;
    --opex-bg: 270 100% 20%;
    --opex-fg: 270 100% 75%;

    /* Confidence Tags - dark mode */
    --confidence-high-bg: 142 71% 20%;
    --confidence-high-fg: 142 71% 75%;
    --confidence-medium-bg: 48 96% 20%;
    --confidence-medium-fg: 48 96% 75%;
    --confidence-low-bg: 0 84% 20%;
    --confidence-low-fg: 0 84% 75%;
  }

  * {
    border-color: hsl(var(--border));
  }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-feature-settings: "rlig" 1, "calt" 1, "ss01" 1;
  }
}
```

### 1.3 Tailwind Config Extensions

**Goal**: Add custom utilities for Notion-style design.

#### Files to Modify
1. `apps/web/tailwind.config.ts`

#### Implementation
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"], // Enable dark mode via class
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
          lighter: "hsl(var(--muted-lighter))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          background: "hsl(var(--destructive-background))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          background: "hsl(var(--success-background))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          background: "hsl(var(--warning-background))",
        },
        border: "hsl(var(--border))",
        "border-subtle": "hsl(var(--border-subtle))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Category colors
        revenue: {
          bg: "hsl(var(--revenue-bg))",
          fg: "hsl(var(--revenue-fg))",
        },
        cogs: {
          bg: "hsl(var(--cogs-bg))",
          fg: "hsl(var(--cogs-fg))",
        },
        opex: {
          bg: "hsl(var(--opex-bg))",
          fg: "hsl(var(--opex-fg))",
        },
        // Confidence colors
        "confidence-high": {
          bg: "hsl(var(--confidence-high-bg))",
          fg: "hsl(var(--confidence-high-fg))",
        },
        "confidence-medium": {
          bg: "hsl(var(--confidence-medium-bg))",
          fg: "hsl(var(--confidence-medium-fg))",
        },
        "confidence-low": {
          bg: "hsl(var(--confidence-low-bg))",
          fg: "hsl(var(--confidence-low-fg))",
        },
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        xl: "var(--radius-xl)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      fontSize: {
        tiny: ["0.6875rem", { lineHeight: "1.4" }], // 11px
      },
      boxShadow: {
        "notion-sm": "0 1px 2px rgba(15, 15, 15, 0.03)",
        "notion-md": "0 1px 3px rgba(15, 15, 15, 0.06)",
        "notion-lg": "0 2px 8px rgba(15, 15, 15, 0.08)",
        "notion-xl": "0 3px 12px rgba(15, 15, 15, 0.1)",
        "notion-hover": "0 4px 16px rgba(15, 15, 15, 0.12)",
      },
      transitionDuration: {
        "150": "150ms",
      },
      transitionTimingFunction: {
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      spacing: {
        "18": "4.5rem",  // 72px
        "22": "5.5rem",  // 88px
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## Phase 2: Layout Architecture

### 2.1 Collapsible Sidebar

**Goal**: Create an elegant, collapsible sidebar with icon-only mode.

#### Files to Create
1. `apps/web/src/components/collapsible-sidebar.tsx`
2. `apps/web/src/hooks/use-sidebar-state.ts`

#### Files to Modify
1. `apps/web/src/app/(app)/layout.tsx`

#### Implementation

**Step 1**: Create sidebar state hook
```typescript
// apps/web/src/hooks/use-sidebar-state.ts
"use client";

import { useState, useEffect } from "react";

const SIDEBAR_STATE_KEY = "nexus-sidebar-collapsed";

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
    setIsLoaded(true);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem(SIDEBAR_STATE_KEY, String(newState));
      return newState;
    });
  };

  return { isCollapsed, toggleSidebar, isLoaded };
}
```

**Step 2**: Update app layout with new sidebar design
```typescript
// apps/web/src/app/(app)/layout.tsx
"use client";

import { useState } from "react";
import { 
  Menu, 
  X, 
  Home, 
  Receipt, 
  Eye, 
  Settings,
  ChevronLeft,
  ChevronRight 
} from "lucide-react";
import { OrgSwitcher } from "@/components/org-switcher";
import { UserMenu } from "@/components/user-menu";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Review", href: "/review", icon: Eye },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isCollapsed, toggleSidebar, isLoaded } = useSidebarState();
  const pathname = usePathname();

  const sidebarWidth = isCollapsed ? "w-16" : "w-60";

  return (
    <div className="h-full">
      {/* Desktop Sidebar */}
      <div 
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300",
          sidebarWidth
        )}
      >
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border-subtle bg-background px-4 pb-4">
          {/* Logo / Brand */}
          <div className="flex h-12 shrink-0 items-center justify-between mt-3">
            {!isCollapsed && (
              <h1 className="text-lg font-semibold tracking-tight">Nexus</h1>
            )}
            <button
              onClick={toggleSidebar}
              className={cn(
                "p-1.5 rounded-md hover:bg-muted transition-colors",
                isCollapsed && "mx-auto"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-x-3 rounded-md p-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-muted text-foreground border-l-2 border-primary -ml-4 pl-[14px]"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        isCollapsed && "justify-center"
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon
                        className="h-5 w-5 shrink-0"
                        aria-hidden="true"
                      />
                      {!isCollapsed && <span>{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={cn("lg:pl-60 transition-all duration-300", isCollapsed && "lg:pl-16")}>
        {/* Top Header */}
        <div className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-x-4 border-b border-border-subtle bg-background px-4 sm:px-6 lg:px-8">
          {/* Mobile menu button */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-muted-foreground lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Spacer */}
          <div className="flex flex-1" />

          {/* Right side: Org Switcher + User Menu */}
          <div className="flex items-center gap-x-3">
            <OrgSwitcher />
            <UserMenu />
          </div>
        </div>

        {/* Page Content */}
        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-foreground/80 backdrop-blur-sm" />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="-m-2.5 p-2.5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>

              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background px-6 pb-4">
                <div className="flex h-12 shrink-0 items-center mt-3">
                  <h1 className="text-lg font-semibold">Nexus</h1>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-1">
                    {navigation.map((item) => {
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={cn(
                              "group flex gap-x-3 rounded-md p-2 text-sm font-medium",
                              isActive
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {item.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2.2 User Menu Component

**Goal**: Add user profile dropdown in header.

#### Files to Create
1. `apps/web/src/components/user-menu.tsx`

#### Implementation
```typescript
// apps/web/src/components/user-menu.tsx
"use client";

import { useState, useEffect } from "react";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface UserData {
  email: string;
  name?: string;
}

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          email: authUser.email || "",
          name: authUser.user_metadata?.name,
        });
      }
    };
    fetchUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || "U";
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
          {getInitials(user.name, user.email)}
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-notion-lg z-50">
            <div className="p-2">
              {/* User info */}
              <div className="px-3 py-2 border-b border-border-subtle">
                <p className="text-sm font-medium">{user.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>

              {/* Menu items */}
              <div className="mt-1 space-y-0.5">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/settings");
                  }}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-destructive-background hover:text-destructive transition-colors"
                  onClick={() => {
                    setIsOpen(false);
                    handleSignOut();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Click outside to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
}
```

---

## Phase 3: Component-Level Updates

### 3.1 Dashboard Metrics Cards

**Goal**: Redesign metric cards with Notion aesthetic.

#### Files to Modify
1. `apps/web/src/components/dashboard/metrics-cards.tsx`
2. `apps/web/src/components/ui/card.tsx`

#### Implementation

**Update Card component**:
```typescript
// apps/web/src/components/ui/card.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-border-subtle bg-card text-card-foreground transition-all duration-150",
      "hover:shadow-notion-md hover:border-border",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xs font-medium uppercase tracking-wider text-muted-foreground",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 pb-6", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center px-6 pb-6", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

**Update MetricsCards component**:
```typescript
// apps/web/src/components/dashboard/metrics-cards.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Eye, PiggyBank } from "lucide-react";
import Link from "next/link";
import { toUSD } from "@nexus/shared";
import type { DashboardDTO } from "@nexus/types/contracts";

interface MetricsCardsProps {
  dashboard: DashboardDTO;
}

export function MetricsCards({ dashboard }: MetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Cash on Hand */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cash on Hand</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">
            {toUSD(dashboard.cashOnHandCents)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Available liquid funds
          </p>
        </CardContent>
      </Card>

      {/* Safe to Spend */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Safe to Spend (14d)</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">
            {toUSD(dashboard.safeToSpend14Cents)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Projected available in 2 weeks
          </p>
        </CardContent>
      </Card>

      {/* Needs Review */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Needs Review</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">
            {dashboard.alerts.needsReviewCount}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <Link href="/review" className="hover:text-foreground transition-colors">
              Transactions to review →
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Spending Trend */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Spending Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">
            {dashboard.trend.outflowDeltaPct > 0 ? "+" : ""}
            {dashboard.trend.outflowDeltaPct}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            vs previous 30 days
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.2 Alerts Row Component

**Goal**: Style alerts as Notion-style callout blocks.

#### Files to Modify
1. `apps/web/src/components/dashboard/alerts-row.tsx`

#### Implementation
```typescript
// apps/web/src/components/dashboard/alerts-row.tsx
import { AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "info" | "warning" | "error";
  message: string;
  dismissible?: boolean;
}

interface AlertsRowProps {
  alerts: Alert[];
  onAlertClick?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
}

export function AlertsRow({ alerts, onAlertClick, onDismiss }: AlertsRowProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors",
            alert.type === "info" && "bg-accent/50 border-primary/20",
            alert.type === "warning" && "bg-warning-background border-warning/20",
            alert.type === "error" && "bg-destructive-background border-destructive/20",
            onAlertClick && "cursor-pointer hover:bg-opacity-70"
          )}
          onClick={() => onAlertClick?.(alert.id)}
        >
          {/* Icon */}
          <div className="mt-0.5">
            {alert.type === "info" && (
              <Info className="h-4 w-4 text-primary" />
            )}
            {alert.type === "warning" && (
              <AlertTriangle className="h-4 w-4 text-warning" />
            )}
            {alert.type === "error" && (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
          </div>

          {/* Message */}
          <div className="flex-1 text-sm">
            {alert.message}
          </div>

          {/* Dismiss button */}
          {alert.dismissible && onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(alert.id);
              }}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Phase 4: Transactions Table Overhaul

### 4.1 Category Pill Component

**Goal**: Create Notion-style category pills with two-tier support.

#### Files to Create
1. `apps/web/src/components/ui/category-pill.tsx`
2. `apps/web/src/components/category-pill-selector.tsx`

#### Implementation

**Step 1**: Create base pill component
```typescript
// apps/web/src/components/ui/category-pill.tsx
import { cn } from "@/lib/utils";

export type CategoryTier1 = "revenue" | "cogs" | "opex" | null;

interface CategoryPillProps {
  tier1: CategoryTier1;
  tier2?: string;
  size?: "sm" | "md";
  className?: string;
}

const tier1Styles: Record<NonNullable<CategoryTier1>, string> = {
  revenue: "bg-revenue-bg text-revenue-fg",
  cogs: "bg-cogs-bg text-cogs-fg",
  opex: "bg-opex-bg text-opex-fg",
};

const tier1Labels: Record<NonNullable<CategoryTier1>, string> = {
  revenue: "Revenue",
  cogs: "COGS",
  opex: "OpEx",
};

export function CategoryPill({ tier1, tier2, size = "md", className }: CategoryPillProps) {
  if (!tier1) {
    return (
      <span className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        "bg-muted text-muted-foreground",
        size === "sm" && "px-2 py-0.5 text-tiny",
        className
      )}>
        Uncategorized
      </span>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {/* Tier 1 */}
      <span className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tier1Styles[tier1],
        size === "sm" && "px-2 py-0.5 text-tiny"
      )}>
        {tier1Labels[tier1]}
      </span>

      {/* Tier 2 (if provided) */}
      {tier2 && (
        <span className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          "bg-muted text-foreground",
          size === "sm" && "px-2 py-0.5 text-tiny"
        )}>
          {tier2}
        </span>
      )}
    </div>
  );
}
```

**Step 2**: Create confidence badge component
```typescript
// apps/web/src/components/ui/confidence-badge.tsx
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  confidence: number | null;
  size?: "sm" | "md";
  className?: string;
}

export function ConfidenceBadge({ confidence, size = "md", className }: ConfidenceBadgeProps) {
  if (confidence === null) return null;

  const level = confidence >= 0.95 ? "high" : confidence >= 0.75 ? "medium" : "low";
  
  const styles = {
    high: "bg-confidence-high-bg text-confidence-high-fg",
    medium: "bg-confidence-medium-bg text-confidence-medium-fg",
    low: "bg-confidence-low-bg text-confidence-low-fg",
  };

  const labels = {
    high: "High",
    medium: "Med",
    low: "Low",
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-tiny font-medium",
        styles[level],
        size === "sm" && "px-1.5 py-0",
        className
      )}
      title={`Confidence: ${Math.round(confidence * 100)}%`}
    >
      {labels[level]}
    </span>
  );
}
```

### 4.2 Transactions Table Redesign

**Goal**: Clean, minimal table with inline editing.

#### Files to Modify
1. `apps/web/src/app/(app)/transactions/page.tsx`

#### Key Changes
```typescript
// In the table section, update to:

<div className="border border-border-subtle rounded-lg overflow-hidden bg-card">
  <table className="w-full">
    <thead>
      <tr className="border-b border-border-subtle">
        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Date
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Vendor
        </th>
        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Amount
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Category
        </th>
        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Confidence
        </th>
        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Actions
        </th>
      </tr>
    </thead>
    <tbody>
      {filteredTransactions.map((transaction, index) => (
        <tr 
          key={transaction.id} 
          className="border-b border-border-subtle last:border-0 hover:bg-muted/30 transition-colors"
        >
          <td className="px-4 py-3 text-sm">
            {new Date(transaction.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {transaction.merchant_name || transaction.description}
              </span>
              {transaction.merchant_name && (
                <span className="text-xs text-muted-foreground">
                  {transaction.description}
                </span>
              )}
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">
            {formatAmount(transaction.amount_cents, transaction.currency)}
          </td>
          <td className="px-4 py-3">
            <CategoryPill 
              tier1={transaction.tier1 as CategoryTier1} 
              tier2={transaction.category_name || undefined}
              size="sm"
            />
          </td>
          <td className="px-4 py-3 text-center">
            <ConfidenceBadge confidence={transaction.confidence} size="sm" />
          </td>
          <td className="px-4 py-3 text-center">
            <button
              className="p-1.5 rounded hover:bg-muted transition-colors"
              onClick={() => setSelectedTransaction(transaction)}
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## Phase 5: Review Queue Redesign

### 5.1 Review Page Updates

**Goal**: Streamlined review interface with bulk actions.

#### Files to Modify
1. `apps/web/src/app/(app)/review/page.tsx`

#### Key Changes
- Replace card-based layout with minimal list view
- Add inline category selector
- Add approve/recategorize buttons
- Implement bulk action bar at bottom

(Detailed implementation to be added during development)

---

## Phase 6: UI Component Library Updates

### 6.1 Button Component

#### Files to Modify
1. `apps/web/src/components/ui/button.tsx`

#### Implementation
```typescript
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-notion-sm hover:shadow-notion-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-background hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        "ghost-subtle": "hover:bg-muted/50 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        notion: "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

### 6.2 Input Component

#### Files to Modify
1. `apps/web/src/components/ui/input.tsx`

#### Implementation
```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-border-subtle bg-transparent px-3 py-1 text-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

### 6.3 Badge Component

#### Files to Modify
1. `apps/web/src/components/ui/badge.tsx`

#### Implementation
```typescript
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive-background text-destructive",
        outline: "text-foreground border-border",
        revenue: "border-transparent bg-revenue-bg text-revenue-fg",
        cogs: "border-transparent bg-cogs-bg text-cogs-fg",
        opex: "border-transparent bg-opex-bg text-opex-fg",
        success: "border-transparent bg-success-background text-success",
        warning: "border-transparent bg-warning-background text-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
```

---

## Phase 7: New Components

### 7.1 Category Pill Selector

**Goal**: Notion-style popover for selecting categories with search.

#### Files to Create
1. `apps/web/src/components/category-pill-selector.tsx`

(Detailed implementation to be added - will use Radix Popover + Command components)

### 7.2 Command Palette

**Goal**: Global search/command interface (Cmd+K).

#### Files to Create
1. `apps/web/src/components/command-palette.tsx`
2. `apps/web/src/hooks/use-keyboard-shortcuts.ts`

(Detailed implementation to be added - will use cmdk library already installed)

### 7.3 Top Expense Categories Widget

**Goal**: Dashboard widget showing top spending categories.

#### Files to Create
1. `apps/web/src/components/dashboard/top-expenses-widget.tsx`

(Detailed implementation to be added - minimal bar chart)

---

## Phase 8: Responsive Design

### 8.1 Mobile Optimization

**Breakpoints**:
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm to lg)
- **Desktop**: >= 1024px (lg+)

**Key Adaptations**:
1. **Sidebar**: Full overlay on mobile (existing behavior enhanced)
2. **Cards**: Single column on mobile, 2-column on tablet, 4-column on desktop
3. **Tables**: Convert to card view on mobile or horizontal scroll
4. **Header**: Reduced height on mobile (48px → 44px)
5. **Spacing**: Reduce padding on mobile (px-4 instead of px-8)

### 8.2 Touch Targets

- Minimum 44x44px for all interactive elements on mobile
- Increase button padding on touch devices
- Add touch-friendly hover states

---

## Additional Enhancements

### Enhancement 1: Keyboard Shortcuts

**Implementation**: Create global keyboard shortcut handler

**Shortcuts**:
- `Cmd/Ctrl + K`: Open command palette
- `Cmd/Ctrl + B`: Toggle sidebar
- `Cmd/Ctrl + /`: Focus search
- `G then D`: Go to Dashboard
- `G then T`: Go to Transactions
- `G then R`: Go to Review
- `Escape`: Close modals/popovers

### Enhancement 2: Empty States

**Pattern**: Consistent empty state design across all views

**Components**:
- Icon in circle (muted background)
- Heading
- Description
- Primary action button
- Optional secondary action link

### Enhancement 3: Loading States

**Pattern**: Minimal skeleton loaders

**Implementation**:
- Remove alternating backgrounds from skeletons
- Subtle pulse animation
- Match actual content layout
- No borders, use background only

### Enhancement 4: Toast Notifications

**Implementation**: Update toast system

**Design**:
- Bottom-right positioning
- Small, compact design
- No shadow, subtle border
- Icon + message inline
- Auto-dismiss after 3-5 seconds
- Notion-style slide-in animation

### Enhancement 5: Micro-interactions

**Animations to Add**:
1. Button hover: 1px lift + shadow increase
2. Card hover: subtle shadow + border color change
3. Input focus: smooth border color transition
4. Page transitions: 150ms fade
5. Sidebar collapse: 300ms smooth width transition
6. Dropdown open: 150ms scale + fade
7. Toast notifications: slide in from bottom-right

### Enhancement 6: Breadcrumb Navigation

**Implementation**: Add breadcrumbs for nested pages

**Pattern**:
- Home / Settings / Connections
- Minimal styling (muted text)
- Chevron separators
- Last item non-clickable (current page)

---

## Implementation Order

### Week 1: Foundation (Phase 1)
- [ ] Install Inter font
- [ ] Update typography system
- [ ] Implement new color palette (light + dark)
- [ ] Update Tailwind config
- [ ] Update base UI components (Button, Input, Badge, Card)
- [ ] Test dark mode toggle

### Week 2: Layout (Phase 2)
- [ ] Create collapsible sidebar
- [ ] Implement sidebar state persistence
- [ ] Update app layout component
- [ ] Create user menu component
- [ ] Update header design
- [ ] Mobile sidebar improvements

### Week 3: Dashboard (Phase 3)
- [ ] Redesign metrics cards
- [ ] Update alerts component
- [ ] Style charts section
- [ ] Create top expenses widget
- [ ] Implement dashboard empty state
- [ ] Dashboard loading states

### Week 4: Transactions (Phase 4)
- [ ] Create category pill component
- [ ] Create confidence badge component
- [ ] Redesign transactions table
- [ ] Implement category pill selector
- [ ] Add inline editing
- [ ] Update filters toolbar
- [ ] Mobile table view

### Week 5: Review & Components (Phases 5 & 7)
- [ ] Redesign review queue
- [ ] Implement bulk actions bar
- [ ] Create command palette
- [ ] Add keyboard shortcuts
- [ ] Implement search functionality
- [ ] Empty states for all views

### Week 6: Polish & Responsive (Phases 6 & 8)
- [ ] Mobile optimizations
- [ ] Touch target improvements
- [ ] Loading state refinements
- [ ] Toast notifications update
- [ ] Micro-interactions
- [ ] Breadcrumb navigation
- [ ] Cross-browser testing
- [ ] Accessibility audit
- [ ] Performance optimization

---

## File Inventory

### Files to Create (~15-20 new files)

#### Components
1. `apps/web/src/components/collapsible-sidebar.tsx`
2. `apps/web/src/components/user-menu.tsx`
3. `apps/web/src/components/category-pill-selector.tsx`
4. `apps/web/src/components/command-palette.tsx`
5. `apps/web/src/components/ui/category-pill.tsx`
6. `apps/web/src/components/ui/confidence-badge.tsx`
7. `apps/web/src/components/dashboard/top-expenses-widget.tsx`
8. `apps/web/src/components/breadcrumbs.tsx`
9. `apps/web/src/components/empty-state.tsx`

#### Hooks
10. `apps/web/src/hooks/use-sidebar-state.ts`
11. `apps/web/src/hooks/use-keyboard-shortcuts.ts`
12. `apps/web/src/hooks/use-command-palette.ts`

#### Utilities
13. `apps/web/src/lib/keyboard-shortcuts.ts`

### Files to Modify (~30-35 files)

#### Core
1. `apps/web/src/app/layout.tsx`
2. `apps/web/src/app/globals.css`
3. `apps/web/tailwind.config.ts`
4. `apps/web/package.json`

#### Layouts
5. `apps/web/src/app/(app)/layout.tsx`

#### Pages
6. `apps/web/src/app/(app)/dashboard/page.tsx`
7. `apps/web/src/app/(app)/transactions/page.tsx`
8. `apps/web/src/app/(app)/review/page.tsx`
9. `apps/web/src/app/(app)/settings/page.tsx`

#### UI Components (all in `apps/web/src/components/ui/`)
10. `button.tsx`
11. `input.tsx`
12. `badge.tsx`
13. `card.tsx`
14. `select.tsx`
15. `dialog.tsx`
16. `popover.tsx`
17. `checkbox.tsx`
18. `label.tsx`
19. `loading-spinner.tsx`
20. `use-toast.ts`

#### Dashboard Components
21. `apps/web/src/components/dashboard/metrics-cards.tsx`
22. `apps/web/src/components/dashboard/alerts-row.tsx`
23. `apps/web/src/components/dashboard/charts-section.tsx`
24. `apps/web/src/components/dashboard/dashboard-empty.tsx`
25. `apps/web/src/components/dashboard/dashboard-loading.tsx`

#### Other Components
26. `apps/web/src/components/org-switcher.tsx`
27. `apps/web/src/components/connect-bank-button.tsx`
28. `apps/web/src/components/disconnect-bank-button.tsx`
29. `apps/web/src/components/review/review-table.tsx`
30. `apps/web/src/components/review/bulk-action-bar.tsx`

---

## Technical Specifications

### Performance Targets
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3.5s
- **Lighthouse Score**: > 90 (Performance, Accessibility, Best Practices)

### Accessibility Requirements
- **WCAG 2.1 Level AA compliance**
- **Color contrast ratio**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Keyboard navigation**: All interactive elements accessible via keyboard
- **Screen reader support**: Proper ARIA labels and semantic HTML
- **Focus indicators**: Visible focus states on all interactive elements

### Browser Support
- **Chrome**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Safari**: Latest 2 versions
- **Edge**: Latest 2 versions
- **Mobile**: iOS Safari 14+, Chrome Android latest

### Animation Performance
- Use `transform` and `opacity` for animations (GPU-accelerated)
- Avoid animating `width`, `height`, `top`, `left` (causes reflow)
- Keep animations under 300ms
- Use `will-change` sparingly

---

## Testing Checklist

### Visual Testing
- [ ] All pages render correctly in light mode
- [ ] All pages render correctly in dark mode
- [ ] Responsive design works on mobile (375px, 414px)
- [ ] Responsive design works on tablet (768px, 1024px)
- [ ] Responsive design works on desktop (1280px, 1920px)
- [ ] All hover states work correctly
- [ ] All focus states are visible
- [ ] All transitions are smooth

### Functional Testing
- [ ] Sidebar collapse/expand works
- [ ] Sidebar state persists across page reloads
- [ ] User menu dropdown works
- [ ] Org switcher works
- [ ] All navigation links work
- [ ] Dashboard data loads correctly
- [ ] Transactions table displays correctly
- [ ] Transaction filtering works
- [ ] Category editing works
- [ ] Review queue works
- [ ] Bulk actions work

### Keyboard Testing
- [ ] All interactive elements accessible via Tab
- [ ] Cmd/Ctrl + K opens command palette
- [ ] Cmd/Ctrl + B toggles sidebar
- [ ] Escape closes modals/popovers
- [ ] Arrow keys navigate dropdowns
- [ ] Enter activates buttons/links

### Accessibility Testing
- [ ] Screen reader announces all content correctly
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus trap works in modals
- [ ] Skip to main content link present

### Performance Testing
- [ ] Page load time < 2.5s on 3G
- [ ] No layout shifts during load
- [ ] Images lazy load
- [ ] Fonts load without FOUT
- [ ] Animations don't cause jank

### Cross-browser Testing
- [ ] Chrome (desktop + mobile)
- [ ] Firefox
- [ ] Safari (desktop + iOS)
- [ ] Edge

---

## Migration Notes

### Breaking Changes
- Font change from Geist to Inter (minimal visual impact)
- Color palette changes (may affect existing custom styles)
- Card component shadow changes
- Button size changes

### Backward Compatibility
- Maintain existing component APIs where possible
- Use CSS variables for colors (easy to toggle old/new)
- Feature flag for gradual rollout (optional)

### Rollout Strategy
1. Deploy to staging environment
2. Internal testing (1-2 days)
3. Beta testing with select users (optional)
4. Monitor performance metrics
5. Full production deployment
6. Monitor user feedback

---

## Success Metrics

### Quantitative
- **Page load time** improved by 20%
- **Time to interactive** improved by 15%
- **User session duration** increased by 10%
- **Task completion rate** increased by 15%
- **Error rate** decreased by 20%

### Qualitative
- **User feedback** positive (NPS survey)
- **Visual consistency** across all pages
- **Professional appearance** for financial data
- **Ease of use** improved (user testing)

---

## Resources

### Design References
- [Notion UI](https://www.notion.so)
- [Linear](https://linear.app)
- [Height](https://height.app)
- [Plane](https://plane.so)

### Documentation
- [Radix UI Documentation](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Inter Font](https://rsms.me/inter/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Tools
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Color Palette Generator](https://coolors.co/)
- [SVG Icons](https://lucide.dev/)

---

## Appendix

### Color Reference Table

| Purpose | Light Mode | Dark Mode | Usage |
|---------|-----------|-----------|-------|
| Background | #FFFFFF | #1C1F26 | Page background |
| Foreground | #37352F | #F2F2F2 | Primary text |
| Muted | #F7F6F3 | #2E3139 | Secondary backgrounds |
| Border | #E9E9E7 | #373B45 | Dividers, borders |
| Primary | #2383E2 | #3B9EFF | Interactive elements |
| Revenue | #E3F2FD / #0D47A1 | Adjusted | Revenue category |
| COGS | #FFE9D6 / #E65100 | Adjusted | COGS category |
| OpEx | #F3E8FF / #6B21A8 | Adjusted | OpEx category |

### Typography Scale Reference

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| H1 | 32px | 700 | 1.2 | -0.02em |
| H2 | 24px | 600 | 1.3 | -0.01em |
| H3 | 20px | 600 | 1.4 | -0.01em |
| Body | 14px | 400 | 1.6 | 0 |
| Small | 12px | 400 | 1.5 | 0 |
| Tiny | 11px | 400 | 1.4 | 0 |
| Label | 12px | 500 | 1.4 | 0.05em |

---

**End of UI Redesign Plan**

This document serves as the comprehensive reference for the Nexus UI redesign. It will be updated as implementation progresses and new requirements emerge.

**Last Updated**: September 29, 2025
