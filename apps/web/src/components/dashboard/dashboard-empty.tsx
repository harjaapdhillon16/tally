import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, PiggyBank, Eye, Building2 } from "lucide-react";
import Link from "next/link";

interface DashboardEmptyProps {
  orgName: string;
}

export function DashboardEmpty({ orgName }: DashboardEmptyProps) {
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash on Hand</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">
              Connect accounts to see data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safe to Spend</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">
              Connect accounts to see data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No transactions to review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Connections
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No accounts connected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Empty state CTA */}
      <Card>
        <CardContent className="p-6">
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
              <Link href="/settings/connections">
                Connect Your Bank
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Secure connection powered by Plaid • Bank-level encryption
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}