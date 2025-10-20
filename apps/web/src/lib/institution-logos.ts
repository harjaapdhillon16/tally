/**
 * Institution Logo Mapping
 * Maps institution names and providers to their logo file paths
 */

export interface Institution {
  name: string;
  logo: string;
}

/**
 * Map of Plaid institution names to logo file paths
 * Logos should be stored in /public/logos/ directory as PNG files
 */
const INSTITUTION_LOGOS: Record<string, string> = {
  // Major US Banks
  'Chase': '/logos/chase.png',
  'Bank of America': '/logos/bofa.png',
  'Wells Fargo': '/logos/wellsfargo.png',
  'Citibank': '/logos/citi.png',
  'U.S. Bank': '/logos/usbank.png',
  'Capital One': '/logos/capitalone.png',
  'PNC Bank': '/logos/pnc.png',
  'TD Bank': '/logos/tdbank.png',
  'Truist': '/logos/truist.png',
  'USAA': '/logos/usaa.png',
  'Charles Schwab': '/logos/schwab.png',
  'Navy Federal Credit Union': '/logos/navyfederal.png',
  'Ally Bank': '/logos/ally.png',
  'American Express': '/logos/amex.png',
  'Discover': '/logos/discover.png',
  
  // Add more as needed
};

/**
 * Map of provider names (for non-Plaid connections) to logo file paths
 */
const PROVIDER_LOGOS: Record<string, string> = {
  'shopify': '/logos/shopify.png',
  'square': '/logos/square.png',
  'stripe': '/logos/stripe.png',
  'paypal': '/logos/paypal.png',
};

/**
 * Get the logo path for a given institution
 * @param institutionName - The institution name from Plaid (e.g., "Chase")
 * @param provider - The provider type (e.g., "plaid", "shopify", "square")
 * @returns Path to the logo file, or generic bank icon as fallback
 */
export function getInstitutionLogo(
  institutionName: string | null | undefined,
  provider: string
): string {
  // Handle non-Plaid providers (POS systems, etc.)
  if (provider !== 'plaid' && PROVIDER_LOGOS[provider]) {
    return PROVIDER_LOGOS[provider];
  }

  // Use institution name if available (from Plaid)
  if (institutionName && INSTITUTION_LOGOS[institutionName]) {
    return INSTITUTION_LOGOS[institutionName];
  }

  // Fallback to generic bank icon
  return '/logos/bank-generic.png';
}

/**
 * Get institution display name
 * @param institutionName - The institution name from database
 * @param provider - The provider type
 * @param accountName - The account name as fallback
 * @returns Human-readable institution name
 */
export function getInstitutionDisplayName(
  institutionName: string | null | undefined,
  provider: string,
  accountName: string
): string {
  // Use institution name if available
  if (institutionName) {
    return institutionName;
  }

  // Use provider name for POS systems
  if (provider !== 'plaid') {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  // Fallback to account name
  return accountName;
}

