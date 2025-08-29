import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface VendorStats {
  vendor: string;
  normalized_vendor: string;
  transaction_count: number;
  org_id: string;
}

// Configuration
const CONFIG = {
  MIN_TRANSACTIONS: 5, // Minimum transactions per vendor to generate embeddings
  BATCH_SIZE: 20, // Process embeddings in batches to avoid rate limits
  EMBEDDING_DIMENSIONS: 1536, // text-embedding-3-small dimensions
};

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get organizations to process
    const { data: orgs, error: orgsError } = await supabase
      .from('orgs')
      .select('id, name')
      .limit(10); // Process max 10 orgs per run

    if (orgsError || !orgs) {
      throw new Error(`Failed to fetch organizations: ${orgsError?.message}`);
    }

    const results: any[] = [];

    for (const org of orgs) {
      try {
        const orgResult = await processOrgEmbeddings(supabase, org.id);
        results.push({
          orgId: org.id,
          orgName: org.name,
          ...orgResult
        });
      } catch (error) {
        console.error(`Failed to process embeddings for org ${org.id}:`, error);
        results.push({
          orgId: org.id,
          error: error.message,
          processed: 0,
        });
      }
    }

    return new Response(JSON.stringify({
      organizations: orgs.length,
      totalVendors: results.reduce((sum, r) => sum + (r.processed || 0), 0),
      results
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Embeddings refresh job error:', error);
    return new Response(JSON.stringify({ 
      error: 'Embeddings refresh failed',
      message: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function processOrgEmbeddings(supabase: any, orgId: string) {
  // Get vendor statistics for this organization
  const { data: vendorStats, error: statsError } = await supabase
    .rpc('get_vendor_stats', { target_org_id: orgId, min_count: CONFIG.MIN_TRANSACTIONS });

  if (statsError) {
    // If RPC doesn't exist, fall back to raw query
    const { data: rawStats, error: rawError } = await supabase
      .from('transactions')
      .select('merchant_name, org_id')
      .eq('org_id', orgId)
      .not('merchant_name', 'is', null);

    if (rawError) {
      throw new Error(`Failed to get vendor stats: ${rawError.message}`);
    }

    // Group by normalized vendor name
    const vendorCounts = new Map<string, { vendor: string; count: number }>();
    
    for (const tx of rawStats || []) {
      const normalized = normalizeVendor(tx.merchant_name);
      if (normalized) {
        if (vendorCounts.has(normalized)) {
          vendorCounts.get(normalized)!.count++;
        } else {
          vendorCounts.set(normalized, { vendor: tx.merchant_name, count: 1 });
        }
      }
    }

    // Filter by minimum count and convert to expected format
    const vendorStatsArray: VendorStats[] = [];
    for (const [normalized, data] of vendorCounts) {
      if (data.count >= CONFIG.MIN_TRANSACTIONS) {
        vendorStatsArray.push({
          vendor: data.vendor,
          normalized_vendor: normalized,
          transaction_count: data.count,
          org_id: orgId,
        });
      }
    }
    
    return await processVendorEmbeddings(supabase, orgId, vendorStatsArray);
  }

  return await processVendorEmbeddings(supabase, orgId, vendorStats);
}

async function processVendorEmbeddings(supabase: any, orgId: string, vendorStats: VendorStats[]) {
  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    errors: [] as string[],
  };

  // Process in batches to avoid rate limits
  for (let i = 0; i < vendorStats.length; i += CONFIG.BATCH_SIZE) {
    const batch = vendorStats.slice(i, i + CONFIG.BATCH_SIZE);
    
    for (const vendor of batch) {
      try {
        await processVendorEmbedding(supabase, orgId, vendor);
        results.processed++;
        
        // Check if embedding already exists
        const { data: existing } = await supabase
          .from('vendor_embeddings')
          .select('vendor')
          .eq('org_id', orgId)
          .eq('vendor', vendor.normalized_vendor)
          .single();
        
        if (existing) {
          results.updated++;
        } else {
          results.created++;
        }

      } catch (error) {
        console.error(`Failed to process embedding for vendor ${vendor.vendor}:`, error);
        results.errors.push(`${vendor.vendor}: ${error.message}`);
      }
    }

    // Brief delay between batches to respect rate limits
    if (i + CONFIG.BATCH_SIZE < vendorStats.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

async function processVendorEmbedding(supabase: any, orgId: string, vendor: VendorStats) {
  // Generate embedding for the normalized vendor name
  const embedding = await generateEmbedding(vendor.normalized_vendor);
  
  // Upsert into vendor_embeddings table
  const { error } = await supabase
    .from('vendor_embeddings')
    .upsert({
      org_id: orgId,
      vendor: vendor.normalized_vendor,
      embedding,
      last_refreshed: new Date().toISOString(),
    }, {
      onConflict: 'org_id,vendor'
    });

  if (error) {
    throw new Error(`Failed to upsert embedding: ${error.message}`);
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
        dimensions: CONFIG.EMBEDDING_DIMENSIONS
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid embedding response format');
    }

    return data.data[0].embedding;

  } catch (error) {
    console.error('OpenAI embedding generation failed:', error);
    throw error;
  }
}

function normalizeVendor(vendor: string): string {
  if (!vendor) return '';
  
  return vendor
    .trim()
    .toLowerCase()
    .replace(/\b(llc|inc|corp|ltd|co|company)\b\.?/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}