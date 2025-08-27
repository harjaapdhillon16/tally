import { createClient } from "@supabase/supabase-js";

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const TEST_SUPABASE_SERVICE_ROLE_KEY =
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createTestClient() {
  return createClient(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY);
}

export async function createTestOrg(name = "Test Org") {
  const client = createTestClient();

  const { data: org, error } = await client
    .from("orgs")
    .insert({
      name,
      industry: "technology",
      timezone: "America/New_York",
    })
    .select("id")
    .single();

  if (error) throw error;
  return org.id;
}

export async function createTestUser(orgId: string) {
  const client = createTestClient();

  // Create a test user (this would depend on your auth setup)
  const { data: user, error: userError } = await client.auth.admin.createUser({
    email: `test-${Date.now()}@example.com`,
    password: "test-password-123",
    email_confirm: true,
  });

  if (userError) throw userError;

  // Add user to org
  const { error: roleError } = await client.from("user_org_roles").insert({
    user_id: user.user.id,
    org_id: orgId,
    role: "owner",
  });

  if (roleError) throw roleError;

  return user.user.id;
}

export async function cleanupTestData(orgId: string) {
  const client = createTestClient();

  // Cleanup in reverse order due to foreign keys
  await client.from("plaid_cursors").delete().match({ connection_id: null }); // Clean orphaned cursors
  await client.from("connection_secrets").delete().match({ connection_id: null }); // Clean orphaned secrets
  await client.from("transactions").delete().eq("org_id", orgId);
  await client.from("accounts").delete().eq("org_id", orgId);
  await client.from("connections").delete().eq("org_id", orgId);
  await client.from("user_org_roles").delete().eq("org_id", orgId);
  await client.from("orgs").delete().eq("id", orgId);
}

export async function createTestConnection(orgId: string, provider = "plaid") {
  const client = createTestClient();

  const { data: connection, error } = await client
    .from("connections")
    .insert({
      org_id: orgId,
      provider,
      provider_item_id: `test_item_${Date.now()}`,
      status: "active",
      scopes: ["transactions"],
    })
    .select("id")
    .single();

  if (error) throw error;
  return connection.id;
}

export async function createTestAccount(connectionId: string, orgId: string) {
  const client = createTestClient();

  const { data: account, error } = await client
    .from("accounts")
    .insert({
      org_id: orgId,
      connection_id: connectionId,
      provider_account_id: `test_account_${Date.now()}`,
      name: "Test Checking Account",
      type: "checking",
      currency: "USD",
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw error;
  return account.id;
}
