import type { LucideIcon } from "lucide-react";
import {
  ShoppingCart,      // Product Sales
  Briefcase,         // Service Revenue
  Ship,              // Shipping Income
  RotateCcw,         // Refunds
  Tag,               // Discounts
  Package,           // Materials & Supplies
  Users,             // Direct Labor
  PackageCheck,      // Packaging
  Truck,             // Freight & Shipping
  Megaphone,         // Marketing & Ads
  Cloud,             // Software Subscriptions
  CreditCard,        // Payment Processing Fees
  UserCheck,         // Labor
  Scale,             // Professional Services
  Home,              // Rent & Utilities
  Shield,            // Insurance
  Paperclip,         // Office Supplies
  Plane,             // Travel & Meals
  Building2,         // Bank Fees
  Phone,             // Telecommunications
  Wrench,            // Repairs & Maintenance
  Car,               // Vehicle & Transportation
  FileText,          // Legal & Compliance
  MoreHorizontal,    // Miscellaneous
  Warehouse,         // Fulfillment & Logistics
  Layers,            // Platform Fees
  Server,            // Hosting & Infrastructure
  DollarSign,        // Payouts Clearing
  Receipt,           // Sales Tax Payable
  // Tier 1 Parents
  TrendingUp,        // Revenue
  ShoppingBag,       // COGS
  Wallet,            // Operating Expenses
  AlertCircle,       // Taxes & Liabilities
  RefreshCw,         // Clearing
} from "lucide-react";

/**
 * Map of category IDs to their corresponding Lucide icons
 * Provides visual cues for each category type while maintaining minimalist aesthetic
 */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // Tier 1 Parents
  '550e8400-e29b-41d4-a716-446655440100': TrendingUp,        // Revenue
  '550e8400-e29b-41d4-a716-446655440200': ShoppingBag,       // COGS
  '550e8400-e29b-41d4-a716-446655440300': Wallet,            // Operating Expenses
  '550e8400-e29b-41d4-a716-446655440400': AlertCircle,       // Taxes & Liabilities
  '550e8400-e29b-41d4-a716-446655440500': RefreshCw,         // Clearing
  
  // Revenue Categories
  '550e8400-e29b-41d4-a716-446655440101': ShoppingCart,      // Product Sales
  '550e8400-e29b-41d4-a716-446655440102': Briefcase,         // Service Revenue
  '550e8400-e29b-41d4-a716-446655440103': Ship,              // Shipping Income
  '550e8400-e29b-41d4-a716-446655440105': RotateCcw,         // Refunds
  '550e8400-e29b-41d4-a716-446655440106': Tag,               // Discounts
  
  // COGS Categories
  '550e8400-e29b-41d4-a716-446655440201': Package,           // Materials & Supplies
  '550e8400-e29b-41d4-a716-446655440202': Users,             // Direct Labor
  '550e8400-e29b-41d4-a716-446655440206': PackageCheck,      // Packaging
  '550e8400-e29b-41d4-a716-446655440207': Truck,             // Freight & Shipping
  
  // Operating Expenses
  '550e8400-e29b-41d4-a716-446655440303': Megaphone,         // Marketing & Ads
  '550e8400-e29b-41d4-a716-446655440304': Cloud,             // Software Subscriptions
  '550e8400-e29b-41d4-a716-446655440301': CreditCard,        // Payment Processing Fees
  '550e8400-e29b-41d4-a716-446655440305': UserCheck,         // Labor
  '550e8400-e29b-41d4-a716-446655440352': Scale,             // Professional Services
  '550e8400-e29b-41d4-a716-446655440353': Home,              // Rent & Utilities
  '550e8400-e29b-41d4-a716-446655440354': Shield,            // Insurance
  '550e8400-e29b-41d4-a716-446655440356': Paperclip,         // Office Supplies
  '550e8400-e29b-41d4-a716-446655440357': Plane,             // Travel & Meals
  '550e8400-e29b-41d4-a716-446655440358': Building2,         // Bank Fees
  '550e8400-e29b-41d4-a716-446655440361': Phone,             // Telecommunications
  '550e8400-e29b-41d4-a716-446655440362': Wrench,            // Repairs & Maintenance
  '550e8400-e29b-41d4-a716-446655440363': Car,               // Vehicle & Transportation
  '550e8400-e29b-41d4-a716-446655440366': FileText,          // Legal & Compliance
  '550e8400-e29b-41d4-a716-446655440308': MoreHorizontal,    // Miscellaneous
  
  // Industry-Specific
  '550e8400-e29b-41d4-a716-446655440321': Warehouse,         // Fulfillment & Logistics
  '550e8400-e29b-41d4-a716-446655440322': Layers,            // Platform Fees
  '550e8400-e29b-41d4-a716-446655440323': Server,            // Hosting & Infrastructure
  
  // Non-P&L
  '550e8400-e29b-41d4-a716-446655440401': Receipt,           // Sales Tax Payable
  '550e8400-e29b-41d4-a716-446655440503': DollarSign,        // Payouts Clearing
};

/**
 * Get the icon component for a given category ID
 * @param categoryId - The UUID of the category
 * @returns The Lucide icon component, or FileText as fallback
 */
export function getCategoryIcon(categoryId: string | null): LucideIcon {
  if (!categoryId) return FileText;
  return CATEGORY_ICON_MAP[categoryId] || FileText;
}

