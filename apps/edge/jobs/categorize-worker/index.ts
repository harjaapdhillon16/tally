import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Background Worker: Continuous Categorization
 * 
 * This function runs on a schedule (via Supabase cron or external trigger) to ensure
 * all transactions eventually get categorized. It's the safety net that handles:
 * - Large transaction batches that couldn't be processed immediately
 * - Failed categorization attempts that need retry
 * - Manual uploads or any other ingestion source
 * 
 * Strategy:
 * 1. Find orgs with uncategorized transactions
 * 2. Process each org in sequence (avoids overwhelming the LLM)
 * 3. Process multiple batches per org if needed
 * 4. Gracefully handle errors without failing the entire job
 */

interface OrgWithUncategorized {
  org_id: string;
  org_name: string;
  uncategorized_count: number;
  oldest_uncategorized: string;
}

// Configuration
const MAX_ORGS_PER_RUN = 5; // Process up to 5 orgs per worker run
const MAX_CALLS_PER_ORG = 20; // Max calls to categorize-queue per org (safety limit)
const MAX_WAIT_MS = 5000; // Max time to wait for rate limit (bounded wait)

serve(async (req) => {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Categorization Worker: Starting background processing');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Step 1: Find orgs with uncategorized transactions
    const { data: orgsWithWork, error: queryError } = await supabase
      .rpc('get_orgs_with_uncategorized_transactions');

    if (queryError) {
      console.error('Failed to query uncategorized transactions:', queryError);
      throw queryError;
    }

    const orgs = (orgsWithWork || []) as OrgWithUncategorized[];
    
    if (orgs.length === 0) {
      console.log('✅ No uncategorized transactions found. Worker idle.');
      return new Response(JSON.stringify({
        status: 'idle',
        message: 'No uncategorized transactions',
        duration_ms: Date.now() - startTime
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`📊 Found ${orgs.length} org(s) with uncategorized transactions:`, 
      orgs.map(o => `${o.org_name}: ${o.uncategorized_count} tx`).join(', ')
    );

    // Step 2: Process orgs in sequence
    const results = [];
    const orgsToProcess = orgs.slice(0, MAX_ORGS_PER_RUN);

    for (const org of orgsToProcess) {
      console.log(`\n📦 Processing org: ${org.org_name} (${org.uncategorized_count} uncategorized)`);
      
      const orgResult = {
        org_id: org.org_id,
        org_name: org.org_name,
        initial_uncategorized: org.uncategorized_count,
        calls_made: 0,
        total_processed: 0,
        total_fallbacks: 0,
        errors: [] as string[]
      };

      // Process multiple calls for this org until complete or limit reached
      let callCount = 0;
      let needsAnotherCall = true;
      
      while (needsAnotherCall && callCount < MAX_CALLS_PER_ORG) {
        try {
          // Call categorize-queue for this specific org
          const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/jobs-categorize-queue`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ orgId: org.org_id })
            }
          );

          if (!response.ok) {
            throw new Error(`Categorization failed: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();
          const processed = result.processed || 0;
          callCount++;
          orgResult.calls_made = callCount;
          
          if (processed > 0) {
            orgResult.total_processed += processed;
            
            // Track fallback usage from the result
            if (result.results && result.results.length > 0) {
              const batchFallbacks = result.results.reduce((sum: number, r: any) => 
                sum + (r.fallbackCount || 0), 0
              );
              orgResult.total_fallbacks += batchFallbacks;
              
              if (batchFallbacks > 0) {
                console.log(`  ✓ Call ${callCount}: processed ${processed} transactions (${batchFallbacks} used fallback), ${result.remaining || 0} remaining`);
              } else {
                console.log(`  ✓ Call ${callCount}: processed ${processed} transactions, ${result.remaining || 0} remaining`);
              }
            } else {
              console.log(`  ✓ Call ${callCount}: processed ${processed} transactions, ${result.remaining || 0} remaining`);
            }
          } else {
            console.log(`  ✓ Call ${callCount}: no transactions processed`);
          }
          
          // Check if we need another call
          needsAnotherCall = result.needsAnotherCall === true;
          
          // If rate limited, wait the suggested time (bounded)
          if (result.rateLimited && result.retryAfterMs > 0 && needsAnotherCall) {
            const waitMs = Math.min(result.retryAfterMs, MAX_WAIT_MS);
            console.log(`  ⏳ Rate limited, waiting ${waitMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
          }
          
          // If no more work, exit loop
          if (!needsAnotherCall) {
            console.log(`  ✅ All transactions processed for ${org.org_name}`);
            break;
          }
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`  ✗ Error processing call ${callCount} for ${org.org_name}:`, errorMsg);
          orgResult.errors.push(errorMsg);
          break; // Stop processing this org on error
        }
      }
      
      if (callCount >= MAX_CALLS_PER_ORG && needsAnotherCall) {
        console.log(`⚠️  Reached max calls (${MAX_CALLS_PER_ORG}) for ${org.org_name}, will continue in next run`);
      }

      if (orgResult.total_fallbacks > 0) {
        console.log(
          `✅ Completed ${org.org_name}: ${orgResult.total_processed} transactions categorized ` +
          `in ${orgResult.calls_made} calls (${orgResult.total_fallbacks} used fallback category)`
        );
      } else {
        console.log(`✅ Completed ${org.org_name}: ${orgResult.total_processed} transactions categorized in ${orgResult.calls_made} calls`);
      }
      results.push(orgResult);
    }

    const totalProcessed = results.reduce((sum, r) => sum + r.total_processed, 0);
    const totalFallbacks = results.reduce((sum, r) => sum + r.total_fallbacks, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const duration = Date.now() - startTime;

    if (totalFallbacks > 0) {
      console.log(
        `\n🎉 Worker completed: ${totalProcessed} transactions processed across ${results.length} orgs in ${duration}ms ` +
        `(⚠️  ${totalFallbacks} used fallback category - manual review recommended)`
      );
    } else {
      console.log(`\n🎉 Worker completed: ${totalProcessed} transactions processed across ${results.length} orgs in ${duration}ms`);
    }

    return new Response(JSON.stringify({
      status: 'completed',
      duration_ms: duration,
      orgs_processed: results.length,
      orgs_pending: Math.max(0, orgs.length - MAX_ORGS_PER_RUN),
      total_processed: totalProcessed,
      total_fallbacks: totalFallbacks,
      total_errors: totalErrors,
      results
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Worker failed:', error);
    
    return new Response(JSON.stringify({
      status: 'error',
      error: 'Worker failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

