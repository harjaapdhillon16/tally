"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { Banknote, TrendingUp, Building2 } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [hasConnections, setHasConnections] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orgName, setOrgName] = useState<string>("Your Organization");

  const supabase = createClient();

  useEffect(() => {
    const checkConnections = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get current org from cookie
        const cookies = document.cookie.split(';');
        const orgCookie = cookies.find(cookie => cookie.trim().startsWith('orgId='));
        const currentOrgId = orgCookie ? orgCookie.split('=')[1] : null;

        if (!currentOrgId) return;

        // Get org name
        const { data: orgData } = await supabase
          .from("orgs")
          .select("name")
          .eq("id", currentOrgId)
          .single();

        if (orgData) {
          setOrgName(orgData.name);
        }

        // Check if org has any connections
        const { data: connections, error } = await supabase
          .from("connections")
          .select("id")
          .eq("org_id", currentOrgId)
          .limit(1);

        if (error) {
          console.error("Error checking connections:", error);
          return;
        }

        setHasConnections(connections && connections.length > 0);
      } catch (error) {
        console.error("Error in checkConnections:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnections();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading your financial overview...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hasConnections === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to {orgName}! Let&apos;s get started by connecting your accounts.
          </p>
        </div>

        {/* Empty state with zero metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Revenue</h3>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">
                Connect accounts to see data
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Expenses</h3>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">
                Connect accounts to see data
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Net Profit</h3>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">
                Connect accounts to see data
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">
                Active Connections
              </h3>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                No accounts connected
              </p>
            </div>
          </div>
        </div>

        {/* Empty state CTA */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <div className="rounded-full bg-accent p-3">
              <Building2 className="h-8 w-8 text-accent-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Connect your bank to get started</h3>
              <p className="text-muted-foreground max-w-md">
                Connect your bank accounts and payment processors to automatically track your 
                income, expenses, and get insights into your business finances.
              </p>
            </div>
            <Button asChild size="lg" className="mt-4">
              <Link href="/connections">
                Connect Your Bank
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Secure connection powered by Plaid • Bank-level encryption
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show full dashboard when connections exist
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your financial data and key metrics.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Revenue</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Expenses</h3>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">$12,234.00</div>
            <p className="text-xs text-muted-foreground">
              +4.3% from last month
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Net Profit</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">$32,997.89</div>
            <p className="text-xs text-muted-foreground">
              +15.8% from last month
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">
              Active Transactions
            </h3>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">
              +201 since last hour
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold">Cash Flow Overview</h3>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Chart placeholder - integrate with chart library
          </div>
        </div>
        <div className="col-span-3 rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Stripe Payment</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
              <span className="text-green-600 font-medium">+$1,999.00</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Office Supplies</p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
              <span className="text-red-600 font-medium">-$234.50</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Client Payment</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
              <span className="text-green-600 font-medium">+$5,432.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}