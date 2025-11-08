

import { ShopifySyncPanel } from "@/components/sopify/shopify-sync-panel";

export default function ConnectionsPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold">Connections</h1>
        <p className="text-muted-foreground mt-1">
          Manage your Shopify integration
        </p>
      </div>

      {/* Shopify Sync Panel */}
      <ShopifySyncPanel />
    </div>
  );
}