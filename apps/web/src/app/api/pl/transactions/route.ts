import type { NextRequest } from "next/server";
import { withOrgFromRequest } from "@/lib/api/with-org";
import { createServerClient } from "@/lib/supabase";
import type { PLTransactionsResponse, PLTransactionDTO } from "@nexus/types/contracts";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await withOrgFromRequest(request);
    const supabase = await createServerClient();

    const url = new URL(request.url);
    const categoryId = url.searchParams.get("categoryId");
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    if (!categoryId) {
      return Response.json({ error: "categoryId is required" }, { status: 400 });
    }

    // Parse month parameter
    let dateFrom: string;
    let dateTo: string;

    if (month === "YTD") {
      const now = new Date();
      const year = now.getFullYear();
      dateFrom = `${year}-01-01`;
      dateTo = now.toISOString().split("T")[0] || "";
    } else {
      const [year, monthNum] = month.split("-");
      if (!year || !monthNum) {
        return Response.json({ error: "Invalid month format" }, { status: 400 });
      }
      
      dateFrom = `${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      dateTo = `${month}-${lastDay.toString().padStart(2, "0")}`;
    }

    // Get total count for pagination
    const { count } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("category_id", categoryId)
      .gte("date", dateFrom)
      .lte("date", dateTo);

    // Get paginated transactions
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("id, date, merchant_name, description, amount_cents, confidence")
      .eq("org_id", orgId)
      .eq("category_id", categoryId)
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching transactions:", error);
      return Response.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }

    const result: PLTransactionsResponse = {
      transactions: (transactions || []).map(tx => ({
        id: tx.id,
        date: tx.date,
        merchantName: tx.merchant_name || null,
        description: tx.description,
        amountCents: tx.amount_cents,
        confidence: tx.confidence || null,
      } as PLTransactionDTO)),
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };

    return Response.json(result, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("P&L transactions API error:", error);

    if (error instanceof Response) {
      return error;
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

