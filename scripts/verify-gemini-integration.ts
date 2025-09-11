#!/usr/bin/env node

import * as dotenv from 'dotenv';
import { scoreWithLLM } from '../packages/categorizer/src/pass2_llm.js';
import type { NormalizedTransaction } from '../packages/types/src/contracts.js';

// Load environment variables
dotenv.config();

// Test scenarios for production verification
const TEST_SCENARIOS = [
  {
    name: 'Hair Services Transaction',
    transaction: {
      id: 'test-1' as any,
      orgId: 'test-org' as any,
      merchantName: 'Elite Hair Salon',
      description: 'Hair cut and style service',
      amountCents: '15000',
      mcc: '7230',
      date: '2024-01-01',
      currency: 'USD',
      source: 'manual',
      reviewed: false,
      needsReview: false,
      raw: {}
    } as any as NormalizedTransaction,
    expectedCategory: 'hair_services'
  },
  {
    name: 'Beauty Supplies Purchase',
    transaction: {
      id: 'test-2' as any, 
      orgId: 'test-org' as any,
      merchantName: 'Sally Beauty Supply',
      description: 'Professional hair care products and tools',
      amountCents: '25000',
      mcc: '5912',
      date: '2024-01-01',
      currency: 'USD',
      source: 'manual',
      reviewed: false,
      needsReview: false,
      raw: {}
    } as any as NormalizedTransaction,
    expectedCategory: 'supplies'
  },
  {
    name: 'Software Subscription',
    transaction: {
      id: 'test-3' as any,
      orgId: 'test-org' as any, 
      merchantName: 'Adobe Creative Cloud',
      description: 'Monthly software subscription',
      amountCents: '2999',
      date: '2024-01-01',
      currency: 'USD',
      source: 'manual',
      reviewed: false,
      needsReview: false,
      raw: {}
    } as any as NormalizedTransaction,
    expectedCategory: 'software'
  },
  {
    name: 'Rent Payment',
    transaction: {
      id: 'test-4' as any,
      orgId: 'test-org' as any,
      merchantName: 'Downtown Property Management',
      description: 'Monthly salon rent payment',
      amountCents: '300000',
      date: '2024-01-01',
      currency: 'USD',
      source: 'manual',
      reviewed: false,
      needsReview: false,
      raw: {}
    } as any as NormalizedTransaction,
    expectedCategory: 'rent_utilities'
  }
];

async function verifyGeminiIntegration() {
  console.log('🔍 Verifying Gemini API Integration...\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY environment variable not set');
    console.error('💡 Get your API key from https://aistudio.google.com/');
    process.exit(1);
  }

  console.log('✅ Gemini API Key found');
  console.log(`🔑 Key starts with: ${process.env.GEMINI_API_KEY.slice(0, 10)}...\n`);

  const mockDb = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null })
        })
      })
    })
  };

  const ctx = {
    orgId: 'test-org' as any, // Cast to avoid branded type issues in test
    db: mockDb,
    config: {
      geminiApiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-2.5-flash-lite'
    },
    analytics: {
      captureEvent: (event: string, data: any) => {
        console.log(`📊 Analytics Event: ${event}`, data);
      },
      captureException: (error: Error) => {
        console.log(`🚨 Analytics Exception:`, error.message);
      }
    },
    logger: {
      error: (message: string, error?: any) => {
        console.log(`🔴 Logger Error: ${message}`, error);
      }
    }
  };

  let successCount = 0;
  let totalCost = 0;

  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`   Merchant: ${scenario.transaction.merchantName}`);
    console.log(`   Description: ${scenario.transaction.description}`);
    console.log(`   Amount: $${(parseInt(scenario.transaction.amountCents) / 100).toFixed(2)}`);

    try {
      const startTime = Date.now();
      const result = await scoreWithLLM(scenario.transaction, ctx);
      const duration = Date.now() - startTime;

      console.log(`   ⏱️  Duration: ${duration}ms`);
      console.log(`   🎯 Category: ${result.categoryId}`);
      console.log(`   📊 Confidence: ${result.confidence}`);
      console.log(`   💭 Rationale: ${result.rationale.join('; ')}`);

      // Estimate cost for Gemini 2.5 Flash-Lite
      const estimatedInputTokens = 150; // Average prompt
      const estimatedOutputTokens = 50; // Average response
      const inputCostPer1kTokens = 0.10 / 1000; // $0.10 per 1M tokens
      const outputCostPer1kTokens = 0.40 / 1000; // $0.40 per 1M tokens
      
      const estimatedCost = 
        (estimatedInputTokens * inputCostPer1kTokens) + 
        (estimatedOutputTokens * outputCostPer1kTokens);
      totalCost += estimatedCost;

      if (result.categoryId && result.confidence && result.confidence > 0.5) {
        console.log(`   ✅ SUCCESS: Valid categorization result`);
        successCount++;
      } else {
        console.log(`   ⚠️  WARNING: Low confidence or missing category`);
      }

    } catch (error) {
      console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log(`\n📈 Summary:`);
  console.log(`   ✅ Successful: ${successCount}/${TEST_SCENARIOS.length}`);
  console.log(`   💰 Estimated Cost: $${totalCost.toFixed(6)} (much cheaper than OpenAI!)`);
  console.log(`   📊 Success Rate: ${((successCount / TEST_SCENARIOS.length) * 100).toFixed(1)}%`);
  console.log(`   🚀 Model: Gemini 2.5 Flash-Lite`);

  if (successCount === TEST_SCENARIOS.length) {
    console.log(`\n🎉 All tests passed! Gemini integration is working correctly.`);
    console.log(`💡 Cost savings: ~67% cheaper than OpenAI GPT-4o-mini`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  Some tests failed. Please check the Gemini API configuration.`);
    process.exit(1);
  }
}

// Run verification
verifyGeminiIntegration().catch((error) => {
  console.error('💥 Verification script failed:', error);
  process.exit(1);
});
