import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionList } from "./transaction-list";
import type { PLTier2CategoryDTO } from "@nexus/types/contracts";
import { getCategoryIcon } from "@/lib/category-icons";

interface Tier2RowProps {
  category: PLTier2CategoryDTO;
  totalRevenue: string;
  tier1Type: 'revenue' | 'cogs' | 'opex';
  month: string;
  orgId: string;
  userId: string;
  onExpand?: ((categoryId: string, categoryName: string) => void) | undefined;
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

function calculatePercentageOfRevenue(partCents: string, revenueCents: string): number {
  const part = Number(BigInt(partCents));
  const revenue = Number(BigInt(revenueCents));
  
  if (revenue === 0) return 0;
  
  // Calculate percentage based on absolute values
  return (Math.abs(part) / Math.abs(revenue)) * 100;
}

export function Tier2Row({ 
  category, 
  totalRevenue,
  tier1Type,
  month, 
  orgId, 
  userId,
  onExpand,
  onTransactionsLoaded 
}: Tier2RowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    if (newExpanded && onExpand) {
      onExpand(category.tier2Id, category.tier2Name);
    }
  };

  const percentageOfRevenue = calculatePercentageOfRevenue(category.tier2TotalCents, totalRevenue);
  const amountCents = Number(BigInt(category.tier2TotalCents));
  const isNegative = amountCents < 0;
  const isRevenue = tier1Type === 'revenue';

  return (
    <div className="ml-4">
      {/* Tier 2 Row - Clickable */}
      <div
        className="flex items-center justify-between py-3 px-4 hover:bg-muted/10 cursor-pointer transition-colors rounded"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          {(() => {
            const Icon = getCategoryIcon(category.tier2Id);
            return <Icon className="h-4 w-4 text-muted-foreground/70 shrink-0" />;
          })()}
          <span className="truncate">{category.tier2Name}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            ({category.transactionCount})
          </span>
        </div>
                <div className="flex items-center gap-6 shrink-0">
                  {!isRevenue && (
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {percentageOfRevenue.toFixed(1)}%
                    </span>
                  )}
                  <span className={cn(
                    "tabular-nums w-32 text-right",
                    isNegative && "text-muted-foreground"
                  )}>
                    {formatAmount(category.tier2TotalCents)}
                  </span>
                </div>
      </div>

      {/* Transaction List - Expanded */}
      {isExpanded && (
        <div className="pl-4 pr-4 pb-2">
          <TransactionList 
            categoryId={category.tier2Id}
            month={month}
            orgId={orgId}
            userId={userId}
            onTransactionsLoaded={onTransactionsLoaded}
          />
        </div>
      )}
    </div>
  );
}

