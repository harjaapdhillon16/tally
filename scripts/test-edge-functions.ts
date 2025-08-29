#!/usr/bin/env node

import * as dotenv from 'dotenv';

dotenv.config();

async function testEdgeFunction(functionName: string, payload?: any) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const url = `${supabaseUrl}/functions/v1/${functionName}`;
  
  console.log(`🚀 Testing Edge Function: ${functionName}`);
  console.log(`   URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: payload ? JSON.stringify(payload) : undefined
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    const data = await response.text();
    console.log(`   Response: ${data.slice(0, 200)}${data.length > 200 ? '...' : ''}`);

    if (response.ok) {
      console.log(`   ✅ SUCCESS`);
      return true;
    } else {
      console.log(`   ❌ FAILED`);
      return false;
    }

  } catch (error) {
    console.log(`   💥 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function testAllEdgeFunctions() {
  console.log('🔍 Testing Edge Functions Integration...\n');

  const functions = [
    { name: 'categorize-queue', payload: null },
    { name: 'embeddings-refresh', payload: null }
  ];

  let successCount = 0;

  for (const func of functions) {
    const success = await testEdgeFunction(func.name, func.payload);
    if (success) successCount++;
    console.log(''); // Empty line
  }

  console.log(`📈 Summary: ${successCount}/${functions.length} edge functions working`);
  
  if (successCount === functions.length) {
    console.log('🎉 All edge functions are accessible!');
  } else {
    console.log('⚠️  Some edge functions may not be deployed correctly.');
  }
}

testAllEdgeFunctions().catch(console.error);