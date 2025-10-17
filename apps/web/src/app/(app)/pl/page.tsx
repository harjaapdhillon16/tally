"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { SummaryCards } from "@/components/pl/summary-cards";
import { CategorySection } from "@/components/pl/category-section";
import { getPosthogClientBrowser } from "@nexus/analytics/client";
import { 
  ANALYTICS_EVENTS,
  type PLPageViewedProps,
  type PLCategoryExpandedProps,
  type PLTransactionsLoadedProps,
  type PLMonthChangedProps
} from "@nexus/types";
import type { PLDTO } from "@nexus/types/contracts";

export default function PLPage() {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  const supabase = createClient();
  const posthog = getPosthogClientBrowser();

  // Get org and user info
  useEffect(() => {
    const getOrgAndUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const cookies = document.cookie.split(";");
      const orgCookie = cookies.find((cookie) => cookie.trim().startsWith("orgId="));
      const orgId = orgCookie ? orgCookie.split("=")[1] : null;

      if (orgId) {
        setCurrentOrgId(orgId);
      }
    };

    getOrgAndUser();
  }, [supabase]);

  // Fetch P&L data
  const { data: plData, isLoading, error } = useQuery<PLDTO>({
    queryKey: ["pl", month, currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) throw new Error("No org ID");
      
      const response = await fetch(`/api/pl?month=${month}`);
      if (!response.ok) {
        throw new Error("Failed to fetch P&L data");
      }
      return response.json();
    },
    enabled: !!currentOrgId,
  });

  // Track page view
  useEffect(() => {
    if (posthog && currentUserId && currentOrgId) {
      const props: PLPageViewedProps = {
        org_id: currentOrgId,
        user_id: currentUserId,
        month,
      };
      posthog.capture(ANALYTICS_EVENTS.PL_PAGE_VIEWED, props);
    }
  }, [month, posthog, currentUserId, currentOrgId]);

  // Handle month change
  const handleMonthChange = (newMonth: string) => {
    if (posthog && currentUserId && currentOrgId) {
      const props: PLMonthChangedProps = {
        org_id: currentOrgId,
        user_id: currentUserId,
        old_month: month,
        new_month: newMonth,
      };
      posthog.capture(ANALYTICS_EVENTS.PL_MONTH_CHANGED, props);
    }
    setMonth(newMonth);
  };

  // Handle category expand
  const handleCategoryExpand = (categoryId: string, categoryName: string, tier: 1 | 2) => {
    if (posthog && currentUserId && currentOrgId) {
      const props: PLCategoryExpandedProps = {
        org_id: currentOrgId,
        user_id: currentUserId,
        category_id: categoryId,
        category_name: categoryName,
        tier,
      };
      posthog.capture(ANALYTICS_EVENTS.PL_CATEGORY_EXPANDED, props);
    }
  };

  // Handle transactions loaded
  const handleTransactionsLoaded = (categoryId: string, offset: number, limit: number) => {
    if (posthog && currentUserId && currentOrgId) {
      const props: PLTransactionsLoadedProps = {
        org_id: currentOrgId,
        user_id: currentUserId,
        category_id: categoryId,
        offset,
        limit,
      };
      posthog.capture(ANALYTICS_EVENTS.PL_TRANSACTIONS_LOADED, props);
    }
  };

  // Generate month options
  const monthOptions = [];
  monthOptions.push({ value: "YTD", label: "Year to Date" });
  
  for (let i = 0; i < 24; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const yearMonth = date.toISOString().slice(0, 7);
    const label = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    monthOptions.push({ value: yearMonth, label });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profit & Loss</h1>
          <p className="text-muted-foreground">Loading your financial statement...</p>
        </div>
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading P&L data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profit & Loss</h1>
          <p className="text-muted-foreground">Error loading financial statement</p>
        </div>
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <Receipt className="h-10 w-10 text-destructive" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-xl font-semibold">Unable to load P&L</h3>
                <p className="text-sm text-muted-foreground">
                  There was an error loading your financial data. Please try again.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!plData) {
    return null;
  }

  const hasData = plData.categories.some(cat => cat.tier2Children.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profit & Loss</h1>
          <p className="text-muted-foreground">
            Real-time financial performance overview
          </p>
        </div>
        
        {/* Month Selector */}
        <div className="w-64">
          <Label htmlFor="month" className="text-xs mb-2 block">
            Period
          </Label>
          <Select value={month} onValueChange={handleMonthChange}>
            <SelectTrigger id="month">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={plData.summary} />

      {/* P&L Statement - Single flowing container */}
      {hasData ? (
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {/* Revenue Section */}
              {plData.categories
                .filter(c => c.tier1Type === 'revenue')
                .map((category) => (
                  <CategorySection
                    key={category.tier1Id}
                    category={category}
                    totalRevenue={plData.summary.totalRevenueCents}
                    month={month}
                    orgId={currentOrgId || ""}
                    userId={currentUserId || ""}
                    onCategoryExpand={handleCategoryExpand}
                    onTransactionsLoaded={handleTransactionsLoaded}
                  />
                ))}

              {/* COGS Section */}
              {plData.categories
                .filter(c => c.tier1Type === 'cogs')
                .map((category) => (
                  <CategorySection
                    key={category.tier1Id}
                    category={category}
                    totalRevenue={plData.summary.totalRevenueCents}
                    month={month}
                    orgId={currentOrgId || ""}
                    userId={currentUserId || ""}
                    onCategoryExpand={handleCategoryExpand}
                    onTransactionsLoaded={handleTransactionsLoaded}
                  />
                ))}

              {/* Gross Profit Separator */}
              {plData.categories.some(c => c.tier1Type === 'revenue') && 
               plData.categories.some(c => c.tier1Type === 'cogs') && (
                <div className="border-t-2 border-b border-border pt-6 pb-4 px-4 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold uppercase tracking-wide">Gross Profit</h3>
                    <span className="text-lg font-bold tabular-nums">
                      {(() => {
                        const amount = Number(BigInt(plData.summary.grossProfitCents)) / 100;
                        const isNegative = amount < 0;
                        const absoluteAmount = Math.abs(amount);
                        const formatted = new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(absoluteAmount);
                        return isNegative ? `(${formatted})` : formatted;
                      })()}
                    </span>
                  </div>
                </div>
              )}

              {/* OpEx Section */}
              {plData.categories
                .filter(c => c.tier1Type === 'opex')
                .map((category) => (
                  <CategorySection
                    key={category.tier1Id}
                    category={category}
                    totalRevenue={plData.summary.totalRevenueCents}
                    month={month}
                    orgId={currentOrgId || ""}
                    userId={currentUserId || ""}
                    onCategoryExpand={handleCategoryExpand}
                    onTransactionsLoaded={handleTransactionsLoaded}
                  />
                ))}

              {/* EBITDA Separator */}
              <div className="border-t-2 border-b border-border pt-6 pb-4 px-4 bg-muted/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold uppercase tracking-wide">EBITDA</h3>
                  <div className="text-right">
                    <div className="text-lg font-bold tabular-nums">
                      {(() => {
                        const amount = Number(BigInt(plData.summary.netIncomeCents)) / 100;
                        const isNegative = amount < 0;
                        const absoluteAmount = Math.abs(amount);
                        const formatted = new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(absoluteAmount);
                        return isNegative ? `(${formatted})` : formatted;
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium mt-1">
                      {plData.summary.profitMarginPct.toFixed(1)}% margin
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Receipt className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-xl font-semibold">No transactions for this period</h3>
                <p className="text-sm text-muted-foreground">
                  There are no categorized transactions for {month === "YTD" ? "this year" : "this month"}. 
                  Try selecting a different time period or check your transactions page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

