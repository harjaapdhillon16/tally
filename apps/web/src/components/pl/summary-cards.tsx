import { Card, CardContent } from "@/components/ui/card";
import type { PLSummaryDTO } from "@nexus/types/contracts";

interface SummaryCardsProps {
  summary: PLSummaryDTO;
}

function formatAmount(amountCents: string, currency: string = "USD"): string {
  const amount = Number(BigInt(amountCents)) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const ebitda = Number(BigInt(summary.netIncomeCents)) / 100;
  const profitMargin = summary.profitMarginPct;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Revenue */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatAmount(summary.totalRevenueCents)}
            </p>
            <p className="text-xs text-muted-foreground">Income from all sources</p>
          </div>
        </CardContent>
      </Card>

      {/* COGS */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Cost of Goods Sold</p>
            <p className="text-2xl font-semibold tabular-nums text-muted-foreground">
              {formatAmount(summary.totalCOGSCents)}
            </p>
            <p className="text-xs text-muted-foreground">Direct costs of production</p>
          </div>
        </CardContent>
      </Card>

      {/* Gross Profit */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Gross Profit</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatAmount(summary.grossProfitCents)}
            </p>
            <p className="text-xs text-muted-foreground">Revenue minus COGS</p>
          </div>
        </CardContent>
      </Card>

      {/* Operating Expenses */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Operating Expenses</p>
            <p className="text-2xl font-semibold tabular-nums text-muted-foreground">
              {formatAmount(summary.totalOpExCents)}
            </p>
            <p className="text-xs text-muted-foreground">Business operating costs</p>
          </div>
        </CardContent>
      </Card>

      {/* EBITDA */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">EBITDA</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatAmount(summary.netIncomeCents)}
            </p>
            <p className="text-xs text-muted-foreground">Earnings before interest, taxes, depreciation</p>
          </div>
        </CardContent>
      </Card>

      {/* Profit Margin */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
            <p className="text-2xl font-semibold tabular-nums">
              {profitMargin.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">EBITDA as % of revenue</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

