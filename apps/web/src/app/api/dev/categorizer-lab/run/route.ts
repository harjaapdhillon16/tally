import { NextRequest, NextResponse } from 'next/server';
import { isCategorizerLabEnabled } from '@/lib/flags';
import { 
  labRunRequestSchema, 
  type LabRunRequest, 
  type LabRunResponse,
  type TransactionResult
} from '@/lib/categorizer-lab/types';
import { 
  mapLabTransactionToNormalized, 
  createLabCategorizationContext,
  extractTimings,
  mapCategorizationResultToLab 
} from '@/lib/categorizer-lab/mappers';
import { calculateMetrics } from '@/lib/categorizer-lab/metrics';
import type { NormalizedTransaction, CategorizationContext, CategorizationResult } from '@nexus/categorizer';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Guard: Only available in development or when explicitly enabled
  if (!isCategorizerLabEnabled()) {
    return NextResponse.json(
      { error: 'Categorizer lab is not available' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    
    // Validate request payload
    const validatedRequest = labRunRequestSchema.parse(body) as LabRunRequest;
    const { dataset, options } = validatedRequest;

    // Process transactions based on engine mode
    const results: TransactionResult[] = [];
    const errors: string[] = [];
    
    // Create a pseudo org ID for the lab context
    const labOrgId = 'lab-org-' + Date.now();
    const ctx = createLabCategorizationContext(labOrgId) as CategorizationContext;
    
    // Process each transaction
    for (const labTx of dataset) {
      const startTime = Date.now();
      let pass1Time: number | undefined;
      let pass2Time: number | undefined;
      
      try {
        // Convert to normalized format
        const normalizedTx = mapLabTransactionToNormalized(labTx, labOrgId);
        
        let finalResult: Record<string, unknown> = {};
        let engine: 'pass1' | 'llm';
        
        switch (options.mode) {
          case 'pass1': {
            const pass1Start = Date.now();
            const pass1Result = await runPass1(normalizedTx, ctx);
            pass1Time = Date.now() - pass1Start;
            
            if (pass1Result.categoryId) finalResult.categoryId = pass1Result.categoryId;
            if (pass1Result.confidence) finalResult.confidence = pass1Result.confidence;
            finalResult.rationale = pass1Result.rationale || [];
            engine = 'pass1';
            break;
          }
          
          case 'pass2': {
            // Check for API key before attempting pass2
            if (!process.env.GEMINI_API_KEY) {
              throw new Error('GEMINI_API_KEY not configured - Pass-2 unavailable');
            }
            
            const pass2Start = Date.now();
            const pass2Result = await runPass2(normalizedTx, ctx);
            pass2Time = Date.now() - pass2Start;
            
            if (pass2Result.categoryId) finalResult.categoryId = pass2Result.categoryId;
            if (pass2Result.confidence) finalResult.confidence = pass2Result.confidence;
            finalResult.rationale = pass2Result.rationale ? [pass2Result.rationale] : [];
            engine = 'llm';
            break;
          }
          
          case 'hybrid': {
            // Run Pass-1 first
            const pass1Start = Date.now();
            const pass1Result = await runPass1(normalizedTx, ctx);
            pass1Time = Date.now() - pass1Start;
            
            if (pass1Result.confidence && pass1Result.confidence >= options.hybridThreshold) {
              // Use Pass-1 result
              if (pass1Result.categoryId) finalResult.categoryId = pass1Result.categoryId;
              if (pass1Result.confidence) finalResult.confidence = pass1Result.confidence;
              finalResult.rationale = pass1Result.rationale || [];
              engine = 'pass1';
            } else {
              // Check for API key before attempting pass2 in hybrid mode
              if (!process.env.GEMINI_API_KEY) {
                throw new Error('GEMINI_API_KEY not configured - Pass-2 unavailable');
              }
              
              // Use Pass-2 (LLM)
              const pass2Start = Date.now();
              const pass2Result = await runPass2(normalizedTx, ctx);
              pass2Time = Date.now() - pass2Start;
              
              if (pass2Result.categoryId) finalResult.categoryId = pass2Result.categoryId;
              if (pass2Result.confidence) finalResult.confidence = pass2Result.confidence;
              finalResult.rationale = pass2Result.rationale ? [pass2Result.rationale] : [];
              engine = 'llm';
            }
            break;
          }
          
          default:
            throw new Error(`Unsupported engine mode: ${options.mode}`);
        }
        
        const timings = extractTimings(startTime, pass1Time, pass2Time);
        
        const result = mapCategorizationResultToLab(
          labTx.id,
          finalResult,
          engine,
          timings
        );
        
        results.push(result);
        
      } catch (error) {
        const timings = extractTimings(startTime, pass1Time, pass2Time);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        const result = mapCategorizationResultToLab(
          labTx.id,
          {},
          'pass1', // Default engine for errors
          timings,
          errorMessage
        );
        
        results.push(result);
        errors.push(`Transaction ${labTx.id}: ${errorMessage}`);
      }
    }
    
    // Calculate metrics
    const metrics = calculateMetrics(dataset, results);
    
    // Round confidence mean to 2 decimals for precision
    if (metrics.confidence.mean) {
      metrics.confidence.mean = Math.round(metrics.confidence.mean * 100) / 100;
    }
    
    // Add cost estimation for LLM calls
    const llmCalls = results.filter(r => r.engine === 'llm').length;
    if (llmCalls > 0) {
      const estimatedCostPerCall = 0.001; // $0.001 per call (rough estimate)
      metrics.cost = {
        estimatedUsd: llmCalls * estimatedCostPerCall,
        calls: llmCalls,
      };
    }
    
    // Determine overall status based on fixed policy
    let status: LabRunResponse['status'];
    if (errors.length === 0) {
      status = 'success';
    } else {
      // Any errors result in partial status (even if all failed per-tx)
      status = 'partial';
    }
    
    const response: LabRunResponse = {
      results,
      metrics,
      status,
      errors,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Lab run error:', error);
    
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = 'Unknown error occurred';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}

/**
 * Run Pass-1 categorization with minimal context
 */
async function runPass1(
  tx: NormalizedTransaction,
  ctx: CategorizationContext
): Promise<{ categoryId?: string | undefined; confidence?: number | undefined; rationale?: string[] | undefined }> {
  try {
    // Dynamic import to handle missing package gracefully
    const { pass1Categorize } = await import('@nexus/categorizer');
    
    // Create minimal context for Pass-1
    const minimalCtx = {
      ...ctx,
      // Provide empty caches to avoid DB dependencies
      caches: {
        vendorRules: new Map(),
        vendorEmbeddings: new Map(),
      },
      // Mock DB client that doesn't make real queries
      db: {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [], error: null })
            })
          })
        })
      }
    } as CategorizationContext & { db: any; caches: any };
    
    const result = await pass1Categorize(tx, minimalCtx);
    
    return {
      categoryId: result.categoryId || undefined,
      confidence: result.confidence || undefined,
      rationale: result.rationale || [],
    };
  } catch (error) {
    // Propagate error instead of fallback mock - let caller handle it
    throw error;
  }
}

/**
 * Run Pass-2 (LLM) categorization
 */
async function runPass2(
  tx: NormalizedTransaction,
  ctx: CategorizationContext
): Promise<{ categoryId?: string | undefined; confidence?: number | undefined; rationale?: string | undefined }> {
  try {
    // Dynamic import to handle missing package gracefully
    const { scoreWithLLM } = await import('@nexus/categorizer');
    
    // Create context with required properties for LLM
    const llmCtx = {
      ...ctx,
      db: {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null })
          })
        })
      },
      config: {
        geminiApiKey: process.env.GEMINI_API_KEY,
      }
    } as CategorizationContext & { db: any; config: { geminiApiKey?: string } };
    
    const result = await scoreWithLLM(tx, llmCtx);
    
    return {
      categoryId: result.categoryId || undefined,
      confidence: result.confidence || undefined,
      rationale: Array.isArray(result.rationale) ? result.rationale.join('; ') : (result.rationale || ''),
    };
  } catch (error) {
    // Propagate error instead of fallback mock
    throw error;
  }
}

// Health check endpoint
export async function GET(): Promise<NextResponse> {
  if (!isCategorizerLabEnabled()) {
    return NextResponse.json(
      { available: false, message: 'Lab is disabled' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    available: true,
    message: 'Categorizer lab is available',
    features: {
      pass1: true,
      pass2: !!process.env.GEMINI_API_KEY,
      hybrid: !!process.env.GEMINI_API_KEY,
    },
  });
}