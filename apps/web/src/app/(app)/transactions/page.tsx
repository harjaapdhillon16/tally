'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase';
// Local currency formatting function to avoid package import issues
function formatAmount(amountCents: string, currency: string = 'USD'): string {
  const amount = parseInt(amountCents) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

interface Transaction {
  id: string;
  date: string;
  amount_cents: string;
  currency: string;
  description: string;
  merchant_name?: string;
  source: string;
  raw: any;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current org from cookie
      const cookies = document.cookie.split(';');
      const orgCookie = cookies.find(cookie => cookie.trim().startsWith('orgId='));
      const currentOrgId = orgCookie ? orgCookie.split('=')[1] : null;

      if (!currentOrgId) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('org_id', currentOrgId)
        .order('date', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="p-4 space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="animate-pulse flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">
          All your financial transactions from connected accounts
        </p>
      </div>

      {transactions.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Merchant</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Source</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => (
                <tr key={transaction.id} className={`border-t hover:bg-muted/50 ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/25'
                }`}>
                  <td className="px-4 py-3 text-sm">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {transaction.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {transaction.merchant_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    {formatAmount(transaction.amount_cents, transaction.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 capitalize">
                      {transaction.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      View Raw
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <div className="rounded-full bg-accent p-3">
                <svg className="h-8 w-8 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">No transactions found</h3>
                <p className="text-muted-foreground max-w-md">
                  Connect your bank accounts to start importing transaction data automatically.
                </p>
              </div>
              <Button asChild>
                <a href="/connections">Connect Bank Account</a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Data Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-lg">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold">Raw Transaction Data</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTransaction(null)}
              >
                Close
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded">
                {JSON.stringify(selectedTransaction.raw, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}