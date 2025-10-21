"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { ShoppingBag } from "lucide-react";

interface ConnectShopifyButtonProps {
  onSuccess?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ConnectShopifyButton({ onSuccess }: ConnectShopifyButtonProps) {
  // Note: onSuccess callback not used because we redirect to Shopify OAuth
  const [isOpen, setIsOpen] = useState(false);
  const [shop, setShop] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!shop.trim()) {
      toast({
        title: "Shop domain required",
        description: "Please enter your Shopify shop domain",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Normalize shop domain
      let shopDomain = shop.trim().toLowerCase();
      
      // Remove protocol if present
      shopDomain = shopDomain.replace(/^https?:\/\//, '');
      
      // Add .myshopify.com if not present and not a custom domain
      if (!shopDomain.includes('.')) {
        shopDomain = `${shopDomain}.myshopify.com`;
      } else if (!shopDomain.endsWith('.myshopify.com') && !shopDomain.includes('.')) {
        shopDomain = `${shopDomain}.myshopify.com`;
      }

      // Redirect to OAuth start endpoint
      window.location.href = `/api/shopify/oauth/start?shop=${encodeURIComponent(shopDomain)}`;
    } catch (error) {
      console.error("Shopify connection error:", error);
      toast({
        title: "Connection failed",
        description: "Failed to initiate Shopify connection. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ShoppingBag className="h-4 w-4" />
          Connect Shopify Store
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Shopify Store</DialogTitle>
          <DialogDescription>
            Enter your Shopify store domain to connect and sync orders, refunds, and revenue data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="shop">Shop Domain</Label>
            <Input
              id="shop"
              placeholder="your-store.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleConnect();
                }
              }}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Enter your full shop domain (e.g., your-store.myshopify.com) or just your store name
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? "Connecting..." : "Connect Store"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

