import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, PiggyBank, Eye, TrendingUp } from "lucide-react";
import Link from "next/link";
import { toUSD } from "@nexus/shared";
import type { DashboardDTO } from "@nexus/types/contracts";

interface MetricsCardsProps {
  dashboard: DashboardDTO;
}

export function MetricsCards({ dashboard }: MetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cash on Hand</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {toUSD(dashboard.cashOnHandCents)}
          </div>
          <p className="text-xs text-muted-foreground">
            Available liquid funds
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Safe to Spend (14d)</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {toUSD(dashboard.safeToSpend14Cents)}
          </div>
          <p className="text-xs text-muted-foreground">
            Projected available in 2 weeks
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {dashboard.alerts.needsReviewCount}
          </div>
          <p className="text-xs text-muted-foreground">
            <Link href="/review" className="hover:underline">
              Transactions to review →
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Spending Trend
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {dashboard.trend.outflowDeltaPct > 0 ? '+' : ''}
            {dashboard.trend.outflowDeltaPct}%
          </div>
          <p className="text-xs text-muted-foreground">
            vs previous 30 days
          </p>
        </CardContent>
      </Card>
    </div>
  );
}