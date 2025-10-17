import { cn } from "@/lib/utils";
import { Tier2Row } from "./tier2-row";
import type { PLTier1CategoryDTO } from "@nexus/types/contracts";

interface CategorySectionProps {
  category: PLTier1CategoryDTO;
  totalRevenue: string;
  month: string;
  orgId: string;
  userId: string;
  onCategoryExpand?: ((categoryId: string, categoryName: string, tier: 1 | 2) => void) | undefined;
  onTransactionsLoaded?: ((categoryId: string, offset: number, limit: number) => void) | undefined;
}

function formatAmount(amountCents: string, currency: string = "USD"): string {
  const amount = Number(BigInt(amountCents)) / 100;
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(absoluteAmount);
  
  return isNegative ? `(${formatted})` : formatted;
}

function calculatePercentageOfRevenue(amountCents: string, revenueCents: string): number {
  const amount = Number(BigInt(amountCents));
  const revenue = Number(BigInt(revenueCents));
  
  if (revenue === 0) return 0;
  
  // Return as absolute percentage
  return (Math.abs(amount) / Math.abs(revenue)) * 100;
}

export function CategorySection({ 
  category, 
  totalRevenue,
  month, 
  orgId, 
  userId,
  onCategoryExpand,
  onTransactionsLoaded 
}: CategorySectionProps) {
  const percentageOfRevenue = calculatePercentageOfRevenue(
    category.tier1TotalCents, 
    totalRevenue
  );
  
  const amountCents = Number(BigInt(category.tier1TotalCents));
  const isNegative = amountCents < 0;
  const isRevenue = category.tier1Type === 'revenue';

  return (
    <div className="border-t border-border pt-6 pb-4 bg-muted/20">
      {/* Tier 1 Header */}
      <div className="px-4 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold uppercase tracking-wide">
            {category.tier1Name}
          </h3>
          <div className="flex items-center gap-6">
            {!isRevenue && (
              <span className="text-sm text-muted-foreground tabular-nums">
                {percentageOfRevenue.toFixed(1)}%
              </span>
            )}
            <span className={cn(
              "text-lg font-semibold tabular-nums w-32 text-right",
              isNegative && "text-muted-foreground"
            )}>
              {formatAmount(category.tier1TotalCents)}
            </span>
          </div>
        </div>
      </div>

      {/* Tier 2 Children */}
      {category.tier2Children.length > 0 && (
        <div className="mt-2 space-y-1">
          {category.tier2Children.map((tier2) => (
            <Tier2Row
              key={tier2.tier2Id}
              category={tier2}
              totalRevenue={totalRevenue}
              tier1Type={category.tier1Type}
              month={month}
              orgId={orgId}
              userId={userId}
              onExpand={onCategoryExpand ? (categoryId, categoryName) => {
                onCategoryExpand(categoryId, categoryName, 2);
              } : undefined}
              onTransactionsLoaded={onTransactionsLoaded || undefined}
            />
          ))}
        </div>
      )}

      {/* Empty state if no children */}
      {category.tier2Children.length === 0 && (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No transactions in this category
        </div>
      )}
    </div>
  );
}

