"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { getInstitutionLogo } from "@/lib/institution-logos";
import { cn } from "@/lib/utils";

interface InstitutionLogoProps {
  institutionName: string | null | undefined;
  provider: string;
  size?: number;
  className?: string;
}

/**
 * Display institution/bank logo with fallback to icon
 * Automatically handles logo loading errors and shows generic bank icon as fallback
 */
export function InstitutionLogo({
  institutionName,
  provider,
  size = 20,
  className = "",
}: InstitutionLogoProps) {
  const [imgError, setImgError] = useState(false);
  const logoPath = getInstitutionLogo(institutionName, provider);

  // If image failed to load, show fallback icon
  if (imgError) {
    return (
      <Building2
        className={cn("text-muted-foreground shrink-0", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <Image
      src={logoPath}
      alt={institutionName || provider || "Bank"}
      width={size}
      height={size}
      className={cn("rounded shrink-0", className)}
      onError={() => setImgError(true)}
    />
  );
}

