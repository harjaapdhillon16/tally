import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfidenceBadge } from "@/components/ui/confidence-badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PLTransactionDTO } from "@nexus/types/contracts";

interface TransactionListProps {
  categoryId: string;
  month: string;
  orgId: string;
  userId: string;
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

export function TransactionList({ 
  categoryId, 
  month, 
  orgId, 
  userId,
  onTransactionsLoaded 
}: TransactionListProps) {
  const [transactions, setTransactions] = useState<PLTransactionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const loadTransactions = async (newOffset: number = 0) => {
    setLoading(true);
    try {
      const limit = newOffset === 0 ? 5 : 20; // First load: 5, subsequent: 20
      const response = await fetch(
        `/api/pl/transactions?categoryId=${categoryId}&month=${month}&limit=${limit}&offset=${newOffset}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to load transactions");
      }

      const data = await response.json();
      
      if (newOffset === 0) {
        setTransactions(data.transactions);
        setInitialLoaded(true);
      } else {
        setTransactions(prev => [...prev, ...data.transactions]);
      }
      
      setTotal(data.total);
      setHasMore(data.hasMore);
      setOffset(newOffset + data.transactions.length);

      // Track analytics
      if (onTransactionsLoaded) {
        onTransactionsLoaded(categoryId, newOffset, limit);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load initial transactions on mount
  if (!initialLoaded && !loading) {
    loadTransactions(0);
  }

  if (!initialLoaded && loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading transactions...</span>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No transactions found
      </div>
    );
  }

  return (
    <div className="space-y-1 mt-2">
      {/* Desktop view */}
      <div className="hidden md:block">
        {transactions.map((tx) => {
          const amountCents = Number(BigInt(tx.amountCents));
          const isNegative = amountCents < 0;

          return (
            <div
              key={tx.id}
              className="flex items-center justify-between py-2 px-4 rounded hover:bg-muted/5 transition-colors text-sm"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className="text-muted-foreground w-24 shrink-0 text-xs">
                  {new Date(tx.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="truncate flex-1">
                  {tx.merchantName || tx.description}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {tx.confidence !== null && (
                  <ConfidenceBadge confidence={tx.confidence} size="sm" />
                )}
                <span className={cn(
                  "tabular-nums w-24 text-right",
                  isNegative && "text-muted-foreground"
                )}>
                  {formatAmount(tx.amountCents)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-2">
        {transactions.map((tx) => {
          const amountCents = Number(BigInt(tx.amountCents));
          const isNegative = amountCents < 0;

          return (
            <div
              key={tx.id}
              className="p-3 rounded bg-muted/5 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    {tx.merchantName || tx.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(tx.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className={cn(
                  "tabular-nums ml-2 shrink-0",
                  isNegative && "text-muted-foreground"
                )}>
                  {formatAmount(tx.amountCents)}
                </div>
              </div>
              {tx.confidence !== null && (
                <div className="flex items-center">
                  <ConfidenceBadge confidence={tx.confidence} size="sm" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadTransactions(offset)}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              `Load 20 more (${total - offset} remaining)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

