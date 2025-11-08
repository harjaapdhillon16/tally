"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle, AlertCircle, Download, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SyncStatus {
  connected: boolean;
  shopDomain?: string;
  lastSyncedAt?: string;
  ordersCount?: number;
  refundsCount?: number;
  message?: string;
  needsSetup?: boolean;
}

export function ShopifySyncPanel() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<'incremental' | 'full'>('incremental');

  // Fetch sync status on mount
  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const fetchSyncStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/shopify/sync');
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          setError('Please sign in to continue');
          return;
        }
        throw new Error('Failed to fetch sync status');
      }

      const data = await response.json();
      setSyncStatus(data);
      
      // Show message if there's a setup issue
      if (data.needsSetup) {
        setError(data.message || 'Organization setup required');
      }
    } catch (err) {
      console.error('Error fetching sync status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sync status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/shopify/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync data');
      }

      const result = await response.json();
      
      setSuccess(
        `Successfully synced ${result.ordersCount} orders and ${result.refundsCount} refunds`
      );

      // Refresh status
      await fetchSyncStatus();
    } catch (err) {
      console.error('Error syncing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync data');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading sync status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show setup required message
  if (syncStatus?.needsSetup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shopify Data Sync</CardTitle>
          <CardDescription>
            Organization setup required
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {syncStatus.message || 'Please set up your organization first before connecting Shopify.'}
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Next steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Complete your organization setup</li>
              <li>Return to this page</li>
              <li>Connect your Shopify store</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!syncStatus?.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shopify Data Sync</CardTitle>
          <CardDescription>
            Connect your Shopify store to sync order and refund data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {syncStatus?.message || 'No Shopify connection found. Please connect your Shopify store first.'}
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">To connect your Shopify store:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Have your Shopify store URL ready (e.g., yourstore.myshopify.com)</li>
              <li>Use the Connect Shopify button in the integrations section</li>
              <li>Authorize the connection on Shopify</li>
              <li>Return here to sync your data</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Shopify Data Sync</CardTitle>
            <CardDescription>
              Sync historical orders and refunds from {syncStatus.shopDomain}
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Orders Synced</p>
            <p className="text-2xl font-bold">{syncStatus.ordersCount?.toLocaleString() || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Refunds Synced</p>
            <p className="text-2xl font-bold">{syncStatus.refundsCount?.toLocaleString() || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Last Synced</p>
            <p className="text-sm font-medium">
              {syncStatus.lastSyncedAt
                ? new Date(syncStatus.lastSyncedAt).toLocaleString()
                : 'Never'}
            </p>
          </div>
        </div>

        {/* Sync Mode Selection */}
        <div className="space-y-3">
          <Label>Sync Mode</Label>
          <RadioGroup value={syncMode} onValueChange={(value) => setSyncMode(value as 'incremental' | 'full')}>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="incremental" id="incremental" />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="incremental"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Incremental Sync (Last 60 days)
                </label>
                <p className="text-sm text-muted-foreground">
                  Syncs orders and refunds from the last 60 days. Fastest option.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="full" id="full" />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="full"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Full Historical Sync
                </label>
                <p className="text-sm text-muted-foreground">
                  Syncs all available order history. May take longer for stores with many orders.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Sync Button */}
        <div className="flex items-center gap-4">
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full sm:w-auto"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing Data...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Sync Shopify Data
              </>
            )}
          </Button>
          
          <Button
            onClick={fetchSyncStatus}
            variant="outline"
            disabled={isSyncing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Status
          </Button>
        </div>

        {/* Info */}
        <Alert>
          <AlertDescription className="text-xs">
            <strong>Note:</strong> Shopify's free tier limits API access to orders from the last 60 days. 
            For full historical access, ensure your Shopify plan supports the required API scopes.
            Real-time webhooks will capture new orders and refunds automatically.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}