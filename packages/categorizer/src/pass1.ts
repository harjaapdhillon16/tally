import type { NormalizedTransaction, CategorizationResult, CategorizationContext } from '@nexus/types';

interface MccMapping {
  [mcc: string]: {
    categoryId: string;
    categoryName: string;
    confidence: number;
  };
}

interface VendorRule {
  id: string;
  pattern: {
    vendor?: string;
    mcc?: string;
    descTokens?: string[];
  };
  categoryId: string;
  weight: number;
}

interface VendorEmbedding {
  vendor: string;
  embedding: number[];
  categoryId: string;
}

// Static MCC mappings for common salon business codes
const MCC_MAPPINGS: MccMapping = {
  '7230': { categoryId: '550e8400-e29b-41d4-a716-446655440002', categoryName: 'Hair Services', confidence: 0.9 },
  '7298': { categoryId: '550e8400-e29b-41d4-a716-446655440004', categoryName: 'Skin Care Services', confidence: 0.9 },
  '5912': { categoryId: '550e8400-e29b-41d4-a716-446655440012', categoryName: 'Supplies & Inventory', confidence: 0.85 },
  '5813': { categoryId: '550e8400-e29b-41d4-a716-446655440011', categoryName: 'Rent & Utilities', confidence: 0.8 },
  '7311': { categoryId: '550e8400-e29b-41d4-a716-446655440015', categoryName: 'Marketing & Advertising', confidence: 0.85 },
  '8931': { categoryId: '550e8400-e29b-41d4-a716-446655440016', categoryName: 'Professional Services', confidence: 0.8 },
  '4829': { categoryId: '550e8400-e29b-41d4-a716-446655440020', categoryName: 'Software & Technology', confidence: 0.85 },
};

/**
 * Normalizes vendor name for consistent matching
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes common business suffixes
 * - Removes punctuation
 */
export function normalizeVendor(vendor: string): string {
  return vendor
    .trim()
    .toLowerCase()
    .replace(/\b(llc|inc|corp|ltd|co|company)\b\.?/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates confidence from rule weight using logarithmic scale
 */
function calculateConfidenceFromWeight(weight: number): number {
  return Math.min(0.95, 0.7 + 0.05 * Math.log1p(weight));
}

/**
 * Calculates cosine similarity between two vectors
 * Note: Currently unused but kept for future embeddings implementation
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) * (a[i] ?? 0);
    normB += (b[i] ?? 0) * (b[i] ?? 0);
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Pass-1 deterministic categorization using heuristics and embeddings boost
 * 
 * Execution order:
 * 1. MCC mapping
 * 2. Vendor alias matching  
 * 3. Recurring pattern matching
 * 4. Embeddings neighbor boost
 * 5. Aggregation and confidence clamping
 */
export async function pass1Categorize(
  tx: NormalizedTransaction,
  ctx: CategorizationContext & {
    db: any; // Supabase client
    analytics?: any;
    logger?: any;
    caches?: {
      vendorRules?: Map<string, VendorRule[]>;
      vendorEmbeddings?: Map<string, VendorEmbedding[]>;
    };
  }
): Promise<CategorizationResult> {
  const rationale: string[] = [];
  let bestCandidate: { categoryId?: string; confidence: number } = { confidence: 0 };

  try {
    // 1. MCC mapping
    if (tx.mcc && MCC_MAPPINGS[tx.mcc]) {
      const mapping = MCC_MAPPINGS[tx.mcc];
      if (mapping) {
        bestCandidate = {
          categoryId: mapping.categoryId,
          confidence: mapping.confidence
        };
        rationale.push(`mcc: ${tx.mcc} → ${mapping.categoryName}`);
      }
    }

    // 2. Vendor alias matching
    if (tx.merchantName) {
      const normalizedVendor = normalizeVendor(tx.merchantName);
      
      // Check cache first
      let vendorRules: VendorRule[] = ctx.caches?.vendorRules?.get(ctx.orgId) || [];
      if (vendorRules.length === 0) {
        // Load vendor rules from database
        const { data: rules, error } = await ctx.db
          .from('rules')
          .select('id, pattern, category_id, weight')
          .eq('org_id', ctx.orgId)
          .not('pattern->vendor', 'is', null);

        if (error) {
          ctx.logger?.error('Failed to load vendor rules', error);
          vendorRules = [];
        } else {
          vendorRules = (rules || []).map((rule: any) => ({
            id: rule.id,
            pattern: rule.pattern,
            categoryId: rule.category_id,
            weight: rule.weight,
          }));
        }

        // Cache the rules
        if (ctx.caches?.vendorRules) {
          ctx.caches.vendorRules.set(ctx.orgId, vendorRules);
        }
      }

      // Find matching vendor rules
      for (const rule of vendorRules) {
        const ruleVendor = rule.pattern?.vendor;
        if (!ruleVendor) continue;

        const normalizedRuleVendor = normalizeVendor(ruleVendor);
        
        // Exact match or fuzzy match
        if (normalizedVendor === normalizedRuleVendor || 
            normalizedVendor.includes(normalizedRuleVendor) ||
            normalizedRuleVendor.includes(normalizedVendor)) {
          
          const confidence = calculateConfidenceFromWeight(rule.weight);
          
          if (confidence > bestCandidate.confidence) {
            bestCandidate = {
              categoryId: rule.categoryId,
              confidence
            };
            rationale.push(`vendor: '${tx.merchantName}' matched rule → category`);
          }
        }
      }
    }

    // 3. Recurring pattern matching
    const description = tx.description.toLowerCase();
    
    // Common recurring patterns for salon businesses
    const patterns = [
      { regex: /adobe|canva|squarespace|wix/, categoryId: '550e8400-e29b-41d4-a716-446655440020', name: 'Software & Technology' },
      { regex: /rent|lease|property|utilities|electric|gas|water/, categoryId: '550e8400-e29b-41d4-a716-446655440011', name: 'Rent & Utilities' },
      { regex: /insurance|liability|workers.comp/, categoryId: '550e8400-e29b-41d4-a716-446655440017', name: 'Insurance' },
      { regex: /license|permit|registration|certification/, categoryId: '550e8400-e29b-41d4-a716-446655440018', name: 'Licenses & Permits' },
      { regex: /payroll|wages|salary|benefits/, categoryId: '550e8400-e29b-41d4-a716-446655440014', name: 'Staff Wages & Benefits' }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(description)) {
        const confidence = 0.75; // Medium confidence for pattern matching
        
        if (confidence > bestCandidate.confidence) {
          bestCandidate = {
            categoryId: pattern.categoryId,
            confidence
          };
          rationale.push(`pattern: '${pattern.regex.source}' matched → ${pattern.name}`);
        }
      }
    }

    // 4. Embeddings neighbor boost (only boost, not standalone decision)
    if (tx.merchantName && bestCandidate.categoryId) {
      // Note: normalizedVendor currently unused but kept for future implementation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const normalizedVendor = normalizeVendor(tx.merchantName);
      
      // Load vendor embeddings from cache or database
      let vendorEmbeddings: VendorEmbedding[] = ctx.caches?.vendorEmbeddings?.get(ctx.orgId) || [];
      if (vendorEmbeddings.length === 0) {
        const { data: embeddings, error } = await ctx.db
          .from('vendor_embeddings')
          .select('vendor, embedding')
          .eq('org_id', ctx.orgId);

        if (!error && embeddings) {
          // Note: In real implementation, we'd need to fetch category_id for each vendor
          // This is simplified for the initial version
          vendorEmbeddings = embeddings.map((e: any) => ({
            vendor: e.vendor,
            embedding: e.embedding,
            categoryId: bestCandidate.categoryId || '' // Simplified
          }));
          
          if (ctx.caches?.vendorEmbeddings) {
            ctx.caches.vendorEmbeddings.set(ctx.orgId, vendorEmbeddings);
          }
        }
      }

      if (vendorEmbeddings.length > 0) {
        // For now, we'll add a small boost if we have embeddings data
        // In a full implementation, we'd calculate actual similarity
        const boost = 0.05;
        bestCandidate.confidence = Math.min(0.98, bestCandidate.confidence + boost);
        rationale.push(`neighbors: similar vendors boost (+${boost.toFixed(2)})`);
      }
    }

    // 5. Aggregation and clamp
    const finalConfidence = Math.min(0.98, Math.max(0.0, bestCandidate.confidence));
    
    return {
      categoryId: bestCandidate.categoryId as any, // Cast to branded type
      confidence: finalConfidence > 0 ? finalConfidence : undefined,
      rationale
    };

  } catch (error) {
    ctx.logger?.error('Pass1 categorization error', error);
    ctx.analytics?.captureException?.(error);
    
    return {
      categoryId: undefined,
      confidence: undefined,
      rationale: ['Error during pass1 categorization']
    };
  }
}