import type { NextRequest } from "next/server";
import { withOrgFromRequest } from "@/lib/api/with-org";
import { createServerClient } from "@/lib/supabase";
import { UNIVERSAL_TAXONOMY } from "@nexus/categorizer";
import type { PLDTO, PLTier1CategoryDTO, PLTier2CategoryDTO } from "@nexus/types/contracts";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await withOrgFromRequest(request);
    const supabase = await createServerClient();

    const url = new URL(request.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const accountId = url.searchParams.get("accountId");

    // Parse month parameter
    let dateFrom: string;
    let dateTo: string;

    if (month === "YTD") {
      // Year to date calculation
      const now = new Date();
      const year = now.getFullYear();
      dateFrom = `${year}-01-01`;
      dateTo = now.toISOString().split("T")[0] || "";
    } else {
      // Specific month (format: YYYY-MM)
      const [year, monthNum] = month.split("-");
      if (!year || !monthNum) {
        return Response.json({ error: "Invalid month format. Use YYYY-MM or YTD" }, { status: 400 });
      }
      
      dateFrom = `${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      dateTo = `${month}-${lastDay.toString().padStart(2, "0")}`;
    }

    // Build query
    let query = supabase
      .from("transactions")
      .select(`
        id,
        date,
        amount_cents,
        category_id,
        categories!inner(id, name, type, parent_id)
      `)
      .eq("org_id", orgId)
      .gte("date", dateFrom)
      .lte("date", dateTo);

    if (accountId) {
      query = query.eq("account_id", accountId);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
      return Response.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }

    // Build taxonomy map for efficient lookup
    const taxonomyMap = new Map(UNIVERSAL_TAXONOMY.map(cat => [cat.id, cat]));

    // Get Tier 1 P&L categories
    const tier1Categories = UNIVERSAL_TAXONOMY.filter(
      cat => cat.tier === 1 && cat.isPnL
    ).sort((a, b) => a.displayOrder - b.displayOrder);

    // Initialize category totals and transaction counts
    const categoryTotals = new Map<string, { totalCents: bigint; count: number }>();
    const tier2Totals = new Map<string, { totalCents: bigint; count: number }>();

    // Process transactions
    for (const tx of transactions || []) {
      const amountCents = BigInt(tx.amount_cents || "0");
      const category = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories;
      
      if (!category) continue;

      const categoryId = category.id;
      const categoryData = taxonomyMap.get(categoryId);
      
      if (!categoryData || !categoryData.isPnL) continue;

      // Determine Tier 1 and Tier 2 IDs
      let tier1Id: string;
      let tier2Id: string;

      if (categoryData.tier === 1) {
        tier1Id = categoryId;
        tier2Id = categoryId; // Self-reference for tier1-only transactions (shouldn't happen)
      } else {
        tier2Id = categoryId;
        tier1Id = categoryData.parentId || "";
      }

      if (!tier1Id) continue;

      // Update Tier 1 totals
      const tier1Current = categoryTotals.get(tier1Id) || { totalCents: BigInt(0), count: 0 };
      categoryTotals.set(tier1Id, {
        totalCents: tier1Current.totalCents + amountCents,
        count: tier1Current.count + 1,
      });

      // Update Tier 2 totals
      if (categoryData.tier === 2) {
        const tier2Current = tier2Totals.get(tier2Id) || { totalCents: BigInt(0), count: 0 };
        tier2Totals.set(tier2Id, {
          totalCents: tier2Current.totalCents + amountCents,
          count: tier2Current.count + 1,
        });
      }
    }

    // Build response structure
    const categories: PLTier1CategoryDTO[] = [];
    let totalRevenueCents = BigInt(0);
    let totalCOGSCents = BigInt(0);
    let totalOpExCents = BigInt(0);

    for (const tier1 of tier1Categories) {
      const tier1Total = categoryTotals.get(tier1.id)?.totalCents || BigInt(0);
      
      // Get Tier 2 children
      const tier2Children = UNIVERSAL_TAXONOMY
        .filter(cat => cat.parentId === tier1.id && cat.tier === 2 && cat.isPnL)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(tier2 => {
          const tier2Data = tier2Totals.get(tier2.id) || { totalCents: BigInt(0), count: 0 };
          return {
            tier2Id: tier2.id,
            tier2Name: tier2.name,
            tier2TotalCents: tier2Data.totalCents.toString(),
            transactionCount: tier2Data.count,
          } as PLTier2CategoryDTO;
        })
        .filter(t2 => t2.transactionCount > 0); // Only include categories with transactions

      // Only include Tier 1 if it has transactions
      if (tier1Total !== BigInt(0) || tier2Children.length > 0) {
        categories.push({
          tier1Id: tier1.id,
          tier1Name: tier1.name,
          tier1Type: tier1.type as 'revenue' | 'cogs' | 'opex',
          tier1TotalCents: tier1Total.toString(),
          tier2Children,
        });

        // Accumulate totals for summary
        if (tier1.type === 'revenue') {
          totalRevenueCents += tier1Total;
        } else if (tier1.type === 'cogs') {
          totalCOGSCents += tier1Total;
        } else if (tier1.type === 'opex') {
          totalOpExCents += tier1Total;
        }
      }
    }

    // Calculate summary metrics
    // Revenue is positive, COGS and OpEx are negative in our system
    const grossProfitCents = totalRevenueCents + totalCOGSCents; // COGS is negative
    const netIncomeCents = grossProfitCents + totalOpExCents; // OpEx is negative
    
    // Calculate profit margin (avoid division by zero)
    const profitMarginPct = totalRevenueCents !== BigInt(0)
      ? Number((netIncomeCents * BigInt(10000)) / totalRevenueCents) / 100
      : 0;

    const result: PLDTO = {
      summary: {
        totalRevenueCents: totalRevenueCents.toString(),
        totalCOGSCents: totalCOGSCents.toString(),
        totalOpExCents: totalOpExCents.toString(),
        grossProfitCents: grossProfitCents.toString(),
        netIncomeCents: netIncomeCents.toString(),
        profitMarginPct,
      },
      categories,
      month,
      generatedAt: new Date().toISOString(),
    };

    return Response.json(result, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("P&L API error:", error);

    if (error instanceof Response) {
      return error;
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

