"use client";

import { useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function ConnectBankButton({ onSuccess }: { onSuccess?: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const { toast } = useToast();

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token, metadata) => {
      try {
        const response = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token, metadata }),
        });

        if (!response.ok) throw new Error("Exchange failed");

        await response.json();
        toast({ title: "Bank connected successfully!" });
        onSuccess?.();
      } catch {
        toast({
          title: "Connection failed",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    },
    onExit: (err) => {
      if (err) {
        toast({
          title: "Connection cancelled",
          description: err.error_message || "Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleConnect = async () => {
    try {
      const response = await fetch("/api/plaid/link-token", { method: "POST" });
      if (!response.ok) throw new Error("Failed to get link token");

      const { linkToken } = await response.json();
      setLinkToken(linkToken);
    } catch {
      toast({
        title: "Failed to initialize",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={linkToken ? () => open() : handleConnect}
      disabled={linkToken ? !ready : false}
    >
      Connect Bank Account
    </Button>
  );
}
