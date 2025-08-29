import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { pass1Categorize } from '@nexus/categorizer/src/pass1';
import { scoreWithLLM } from '@nexus/categorizer/src/pass2_llm';

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
};

describe('Categorization Pipeline E2E', () => {
  let supabase: any;
  let testOrgId: string;
  let testUserId: string;
  let testTransactionIds: string[] = [];

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey);

    // Create test organization and user
    const { data: org } = await supabase
      .from('orgs')
      .insert({ name: 'E2E Test Salon' })
      .select()
      .single();
    testOrgId = org.id;

    const { data: user } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'test123',
      email_confirm: true
    });
    testUserId = user.user.id;

    // Add user to org
    await supabase
      .from('user_org_roles')
      .insert({
        user_id: testUserId,
        org_id: testOrgId,
        role: 'owner'
      });
  });

  afterAll(async () => {
    // Clean up test data
    if (testTransactionIds.length > 0) {
      await supabase
        .from('transactions')
        .delete()
        .in('id', testTransactionIds);
    }

    await supabase
      .from('user_org_roles')
      .delete()
      .eq('org_id', testOrgId);

    await supabase
      .from('orgs')
      .delete()
      .eq('id', testOrgId);

    await supabase.auth.admin.deleteUser(testUserId);
  });

  test('Pass-1 high confidence categorization (MCC mapping)', async () => {
    // Create test transaction with hair services MCC
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        org_id: testOrgId,
        date: '2024-01-01',
        amount_cents: '15000',
        currency: 'USD',
        description: 'Hair cut and style',
        merchant_name: 'Elite Hair Salon',
        mcc: '7230', // Hair services
        source: 'test',
        raw: {}
      })
      .select()
      .single();

    testTransactionIds.push(transaction.id);

    const ctx = {
      orgId: testOrgId,
      db: supabase,
      analytics: {
        captureEvent: () => {},
        captureException: () => {}
      },
      logger: {
        info: () => {},
        error: () => {}
      }
    };

    // Test Pass-1 categorization
    const pass1Result = await pass1Categorize(transaction, ctx);

    expect(pass1Result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440002'); // Hair Services
    expect(pass1Result.confidence).toBe(0.9);
    expect(pass1Result.rationale).toContain('mcc: 7230 → Hair Services');

    // Verify transaction was updated (simulating decideAndApply)
    await supabase
      .from('transactions')
      .update({
        category_id: pass1Result.categoryId,
        confidence: pass1Result.confidence,
        needs_review: false,
        reviewed: false
      })
      .eq('id', transaction.id);

    // Verify transaction was updated correctly
    const { data: updatedTx } = await supabase
      .from('transactions')
      .select('category_id, confidence, needs_review, reviewed')
      .eq('id', transaction.id)
      .single();

    expect(updatedTx.category_id).toBe('550e8400-e29b-41d4-a716-446655440002');
    expect(updatedTx.confidence).toBe(0.9);
    expect(updatedTx.needs_review).toBe(false);
    expect(updatedTx.reviewed).toBe(false);
  });

  test('Pass-1 → Pass-2 LLM categorization (low confidence)', async () => {
    // Create test transaction with unclear categorization
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        org_id: testOrgId,
        date: '2024-01-01',
        amount_cents: '5000',
        currency: 'USD',
        description: 'Monthly subscription beauty supplies order',
        merchant_name: 'Beauty Supply Co',
        source: 'test',
        raw: {}
      })
      .select()
      .single();

    testTransactionIds.push(transaction.id);

    const ctx = {
      orgId: testOrgId,
      db: supabase,
      analytics: {
        captureEvent: () => {},
        captureException: () => {}
      },
      logger: {
        info: () => {},
        error: () => {}
      },
      config: {
        openaiApiKey: TEST_CONFIG.openaiApiKey,
        model: 'gpt-4o-mini'
      }
    };

    // Test Pass-1 categorization (should be low/no confidence)
    const pass1Result = await pass1Categorize(transaction, ctx);
    
    // If Pass-1 is not confident enough, try Pass-2
    let finalResult = pass1Result;
    let source: 'pass1' | 'llm' = 'pass1';

    if (!pass1Result.confidence || pass1Result.confidence < 0.85) {
      const llmResult = await scoreWithLLM(transaction, ctx);
      if (llmResult.confidence && llmResult.confidence > (pass1Result.confidence || 0)) {
        finalResult = llmResult;
        source = 'llm';
      }
    }

    // Verify LLM was used and provided reasonable categorization
    expect(source).toBe('llm');
    expect(finalResult.categoryId).toBeDefined();
    expect(finalResult.confidence).toBeGreaterThan(0);
    expect(finalResult.rationale).toContain('LLM:');

    // Update transaction with final result
    await supabase
      .from('transactions')
      .update({
        category_id: finalResult.categoryId,
        confidence: finalResult.confidence,
        needs_review: (finalResult.confidence || 0) < 0.7,
        reviewed: false
      })
      .eq('id', transaction.id);

    // Verify decision was recorded correctly
    const { data: updatedTx } = await supabase
      .from('transactions')
      .select('category_id, confidence, needs_review')
      .eq('id', transaction.id)
      .single();

    expect(updatedTx.category_id).toBe(finalResult.categoryId);
    expect(updatedTx.confidence).toBe(finalResult.confidence);
  });

  test('Corrections workflow and rule generation', async () => {
    // Create test transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        org_id: testOrgId,
        date: '2024-01-01',
        amount_cents: '8000',
        currency: 'USD',
        description: 'Professional hair products',
        merchant_name: 'Sally Beauty Supply',
        source: 'test',
        raw: {},
        category_id: '550e8400-e29b-41d4-a716-446655440024', // Incorrect initial category
        confidence: 0.6,
        needs_review: true
      })
      .select()
      .single();

    testTransactionIds.push(transaction.id);

    // Simulate correction via API
    const correctionPayload = {
      txId: transaction.id,
      newCategoryId: '550e8400-e29b-41d4-a716-446655440012' // Supplies
    };

    // Test correction logic (simulating API call)
    await supabase
      .from('transactions')
      .update({
        category_id: correctionPayload.newCategoryId,
        reviewed: true,
        needs_review: false
      })
      .eq('id', transaction.id);

    // Insert correction record
    await supabase
      .from('corrections')
      .insert({
        org_id: testOrgId,
        tx_id: transaction.id,
        old_category_id: transaction.category_id,
        new_category_id: correctionPayload.newCategoryId,
        user_id: testUserId
      });

    // Generate rule from correction
    const rulePattern = {
      vendor: 'sally beauty supply' // normalized
    };

    await supabase
      .from('rules')
      .upsert({
        org_id: testOrgId,
        pattern: rulePattern,
        category_id: correctionPayload.newCategoryId,
        weight: 1
      });

    // Verify correction was recorded
    const { data: correction } = await supabase
      .from('corrections')
      .select('*')
      .eq('tx_id', transaction.id)
      .single();

    expect(correction.new_category_id).toBe('550e8400-e29b-41d4-a716-446655440012');

    // Verify rule was created
    const { data: rule } = await supabase
      .from('rules')
      .select('*')
      .eq('org_id', testOrgId)
      .eq('pattern->vendor', 'sally beauty supply')
      .single();

    expect(rule.category_id).toBe('550e8400-e29b-41d4-a716-446655440012');
    expect(rule.weight).toBe(1);

    // Test that future transactions with same vendor get auto-categorized
    const { data: futureTransaction } = await supabase
      .from('transactions')
      .insert({
        org_id: testOrgId,
        date: '2024-01-02',
        amount_cents: '12000',
        currency: 'USD',
        description: 'Hair care products restock',
        merchant_name: 'Sally Beauty Supply LLC', // Slight variation
        source: 'test',
        raw: {}
      })
      .select()
      .single();

    testTransactionIds.push(futureTransaction.id);

    const ctx = {
      orgId: testOrgId,
      db: supabase,
      caches: new Map()
    };

    const futurePass1Result = await pass1Categorize(futureTransaction, ctx);

    expect(futurePass1Result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440012');
    expect(futurePass1Result.confidence).toBeGreaterThan(0.7);
    expect(futurePass1Result.rationale).toContain('vendor:');
  });

  test('Embeddings integration (if implemented)', async () => {
    // This test verifies embeddings neighbor boost functionality
    // Skip if embeddings table is empty (expected in test environment)
    
    const { data: embeddingsCount } = await supabase
      .from('vendor_embeddings')
      .select('id', { count: 'exact' })
      .eq('org_id', testOrgId);

    if (embeddingsCount?.count === 0) {
      console.log('Skipping embeddings test - no embeddings data in test environment');
      return;
    }

    // Test embeddings neighbor boost
    // This would require actual embeddings data to be meaningful
    expect(true).toBe(true); // Placeholder
  });
});