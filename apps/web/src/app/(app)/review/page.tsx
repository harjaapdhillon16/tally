"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase";
import { Check, Eye } from "lucide-react";
import { toUSD } from "@nexus/shared";
import type { TransactionCorrectRequest } from "@nexus/types/contracts";

interface CategoryInfo {
  name: string;
}

interface Transaction {
  id: string;
  date: string;
  amount_cents: string;
  currency: string;
  description: string;
  merchant_name?: string;
  category_id?: string;
  confidence?: number;
  needs_review: boolean;
  categories?: CategoryInfo | null;
}

interface Category {
  id: string;
  name: string;
}

export default function ReviewPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const getCurrentOrgId = () => {
    const cookies = document.cookie.split(';');
    const orgCookie = cookies.find(cookie => cookie.trim().startsWith('orgId='));
    return orgCookie ? orgCookie.split('=')[1] : null;
  };

  // Fetch transactions that need review
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions-review'],
    queryFn: async () => {
      const orgId = getCurrentOrgId();
      if (!orgId) throw new Error('No org ID');

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          date,
          amount_cents,
          currency,
          description,
          merchant_name,
          category_id,
          confidence,
          needs_review,
          categories(name)
        `)
        .eq('org_id', orgId)
        .eq('needs_review', true)
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      // Cast with proper type safety
      return (data || []).map(item => ({
        ...item,
        categories: item.categories?.[0] || null, // Handle array response from Supabase
      })) as Transaction[];
    },
  });

  // Fetch available categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const orgId = getCurrentOrgId();
      if (!orgId) throw new Error('No org ID');

      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .or(`org_id.eq.${orgId},org_id.is.null`) // Allow global or org-specific categories
        .order('name');

      if (error) throw error;
      return data as Category[];
    },
  });

  // Mutation to correct a transaction category
  const correctTransactionMutation = useMutation({
    mutationFn: async ({ txId, newCategoryId }: { txId: string; newCategoryId: string }) => {
      const request: TransactionCorrectRequest = {
        txId: txId as any, // Type assertion for branded ID
        newCategoryId: newCategoryId as any,
      };

      const response = await fetch('/api/transactions/correct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to correct transaction');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate transactions review query
      queryClient.invalidateQueries({ queryKey: ['transactions-review'] });
      
      // Invalidate dashboard query to update metrics
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Also invalidate any transactions list query
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const handleCorrectTransaction = (txId: string, newCategoryId: string) => {
    correctTransactionMutation.mutate({ txId, newCategoryId });
  };

  if (transactionsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Transactions</h1>
          <p className="text-muted-foreground">Loading transactions that need review...</p>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Review Transactions</h1>
        <p className="text-muted-foreground">
          Review and categorize transactions that need attention.
        </p>
      </div>

      {transactions.length > 0 ? (
        <div className="grid gap-4">
          {transactions.map((transaction) => (
            <Card key={transaction.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {transaction.merchant_name || transaction.description}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <Eye className="w-3 h-3 mr-1" />
                      Needs Review
                    </Badge>
                    <span className="text-lg font-bold">
                      {toUSD(transaction.amount_cents)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date:</span>{" "}
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Description:</span>{" "}
                      {transaction.description}
                    </div>
                    {transaction.confidence && (
                      <div>
                        <span className="text-muted-foreground">AI Confidence:</span>{" "}
                        {Math.round(transaction.confidence * 100)}%
                      </div>
                    )}
                    {transaction.categories?.name && (
                      <div>
                        <span className="text-muted-foreground">Current Category:</span>{" "}
                        {transaction.categories.name}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Select
                        onValueChange={(categoryId) => 
                          handleCorrectTransaction(transaction.id, categoryId)
                        }
                        disabled={correctTransactionMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {correctTransactionMutation.isPending && (
                      <Badge variant="secondary">Saving...</Badge>
                    )}
                  </div>

                  {correctTransactionMutation.error && (
                    <div className="text-sm text-red-600">
                      {correctTransactionMutation.error.message}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-4">
              <div className="rounded-full bg-green-100 p-3 w-fit mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">All caught up!</h3>
                <p className="text-muted-foreground">
                  There are no transactions that need review at this time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}