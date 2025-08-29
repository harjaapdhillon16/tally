#!/usr/bin/env node

import * as dotenv from 'dotenv';
import { scoreWithLLM } from '../packages/categorizer/src/pass2_llm';
import type { NormalizedTransaction } from '@nexus/types';

// Load environment variables
dotenv.config();

// Test scenarios for production verification
const TEST_SCENARIOS = [
  {
    name: 'Hair Services Transaction',
    transaction: {
      id: 'test-1',
      orgId: 'test-org',
      merchantName: 'Elite Hair Salon',
      description: 'Hair cut and style service',
      amountCents: '15000',
      mcc: '7230',
      date: '2024-01-01',
      currency: 'USD',
      source: 'test',
      reviewed: false,
      needsReview: false,
      raw: {}
    } as NormalizedTransaction,
    expectedCategory: 'hair_services'
  },
  {
    name: 'Beauty Supplies Purchase',
    transaction: {
      id: 'test-2', 
      orgId: 'test-org',
      merchantName: 'Sally Beauty Supply',
      description: 'Professional hair care products and tools',
      amountCents: '25000',
      mcc: '5912',
      date: '2024-01-01',
      currency: 'USD',
      source: 'test',
      reviewed: false,
      needsReview: false,
      raw: {}
    } as NormalizedTransaction,
    expectedCategory: 'supplies'
  },
  {
    name: 'Software Subscription',
    transaction: {
      id: 'test-3',
      orgId: 'test-org', 
      merchantName: 'Adobe Creative Cloud',
      description: 'Monthly software subscription',
      amountCents: '2999',
      date: '2024-01-01',
      currency: 'USD',
      source: 'test',
      reviewed: false,
      needsReview: false,
      raw: {}
    } as NormalizedTransaction,
    expectedCategory: 'software'
  }
];

async function verifyOpenAIIntegration() {
  console.log('🔍 Verifying OpenAI API Integration...\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable not set');
    process.exit(1);
  }

  console.log('✅ OpenAI API Key found');
  console.log(`🔑 Key starts with: ${process.env.OPENAI_API_KEY.slice(0, 10)}...\n`);

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
    orgId: 'test-org',
    db: mockDb,
    config: {
      openaiApiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini'
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

      // Estimate cost (rough approximation)
      const estimatedTokens = 150; // Average prompt + response
      const costPer1kTokens = 0.0005; // GPT-4o-mini pricing
      const estimatedCost = (estimatedTokens / 1000) * costPer1kTokens;
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
  console.log(`   💰 Estimated Cost: $${totalCost.toFixed(4)}`);
  console.log(`   📊 Success Rate: ${((successCount / TEST_SCENARIOS.length) * 100).toFixed(1)}%`);

  if (successCount === TEST_SCENARIOS.length) {
    console.log(`\n🎉 All tests passed! OpenAI integration is working correctly.`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  Some tests failed. Please check the OpenAI API configuration.`);
    process.exit(1);
  }
}

// Run verification
verifyOpenAIIntegration().catch((error) => {
  console.error('💥 Verification script failed:', error);
  process.exit(1);
});