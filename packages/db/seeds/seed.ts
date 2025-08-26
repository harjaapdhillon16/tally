import { createClient } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker";
import * as dotenv from "dotenv";
import { resolve } from "path";
import { randomUUID } from "crypto";

// Load environment variables from project root
dotenv.config({ path: resolve(process.cwd(), "../../.env") });

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Salon-specific vendor patterns for realistic transaction generation
const SALON_VENDORS = {
  rent: [
    "Metro Property Management",
    "Plaza Mall Leasing",
    "Downtown Properties LLC",
    "City Center Realty",
    "Prime Location Rentals",
  ],
  utilities: [
    "Pacific Gas & Electric",
    "ConEd",
    "Metro Water Authority",
    "Spectrum Business",
    "Verizon Business",
    "AT&T Business",
  ],
  supplies: [
    "Sally Beauty Supply",
    "CosmoProf",
    "Beauty Plus Salon Supply",
    "Professional Beauty Supply",
    "Salon Centric",
    "Beauty Brands",
  ],
  equipment: [
    "Belvedere Equipment",
    "Minerva Beauty",
    "Takara Belmont",
    "Collins Manufacturing",
    "Pibbs Industries",
  ],
  pos_fees: [
    "Square Processing",
    "Toast Payment Processing",
    "Clover Processing",
    "Stripe Payment Processing",
    "PayPal Business",
  ],
  software: [
    "Vagaro Salon Software",
    "Booksy Business",
    "StyleSeat Pro",
    "Salon Iris",
    "MindBody Business",
    "Fresha Pro",
  ],
  marketing: [
    "Google Ads",
    "Facebook Ads Manager",
    "Instagram Business",
    "Yelp Advertising",
    "Local Print Ads",
    "Radio Marketing",
  ],
  insurance: [
    "State Farm Business",
    "Progressive Commercial",
    "Liberty Mutual Business",
    "Nationwide Commercial",
    "Allstate Business",
  ],
  professional: [
    "Johnson & Associates CPA",
    "Metro Accounting Services",
    "BizTax Pro",
    "Legal Services LLC",
    "Business Attorney Group",
  ],
};

const REVENUE_SERVICES = [
  "Hair Cut & Style",
  "Hair Color Service",
  "Highlights/Lowlights",
  "Blowout Service",
  "Hair Extensions",
  "Keratin Treatment",
  "Manicure",
  "Pedicure",
  "Gel Manicure",
  "Acrylic Nails",
  "Facial Treatment",
  "Eyebrow Wax",
  "Lip Wax",
  "Full Body Wax",
  "Massage Therapy",
  "Deep Tissue Massage",
  "Relaxation Massage",
  "Hair Product Sale",
  "Nail Product Sale",
  "Gift Card Sale",
];

// Helper function to get random element from array
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// Generate random amount in cents for different transaction types
function generateAmount(type: "revenue" | "expense", category: string): number {
  if (type === "revenue") {
    // Revenue amounts (positive)
    if (category.includes("Gift Card"))
      return faker.number.int({ min: 2500, max: 15000 }); // $25-150
    if (category.includes("Product"))
      return faker.number.int({ min: 1500, max: 8000 }); // $15-80
    if (category.includes("Massage"))
      return faker.number.int({ min: 6000, max: 12000 }); // $60-120
    if (category.includes("Hair"))
      return faker.number.int({ min: 3500, max: 20000 }); // $35-200
    if (category.includes("Nail"))
      return faker.number.int({ min: 2500, max: 8000 }); // $25-80
    return faker.number.int({ min: 2000, max: 15000 }); // Default service $20-150
  } else {
    // Expense amounts (negative)
    if (category.includes("Rent"))
      return -faker.number.int({ min: 250000, max: 800000 }); // -$2,500-8,000
    if (category.includes("Utilities"))
      return -faker.number.int({ min: 15000, max: 60000 }); // -$150-600
    if (category.includes("Supplies"))
      return -faker.number.int({ min: 5000, max: 50000 }); // -$50-500
    if (category.includes("Equipment"))
      return -faker.number.int({ min: 20000, max: 200000 }); // -$200-2,000
    if (category.includes("Staff"))
      return -faker.number.int({ min: 150000, max: 500000 }); // -$1,500-5,000
    if (category.includes("Software"))
      return -faker.number.int({ min: 2900, max: 19900 }); // -$29-199
    if (category.includes("Marketing"))
      return -faker.number.int({ min: 10000, max: 100000 }); // -$100-1,000
    if (category.includes("Insurance"))
      return -faker.number.int({ min: 20000, max: 80000 }); // -$200-800
    if (category.includes("Bank Fees"))
      return -faker.number.int({ min: 295, max: 2995 }); // -$2.95-29.95
    return -faker.number.int({ min: 2500, max: 50000 }); // Default expense -$25-500
  }
}

// Generate realistic raw JSON payload for manual transactions
function generateRawPayload(
  description: string,
  amountCents: number,
  merchantName: string,
): object {
  return {
    source: "manual",
    original_description: description,
    amount: amountCents / 100,
    currency: "USD",
    merchant: {
      name: merchantName,
      category: amountCents > 0 ? "beauty_salon" : "business_expense",
    },
    metadata: {
      entry_method: "manual",
      created_by: "seed_script",
      confidence: faker.number.float({ min: 0.7, max: 0.95, multipleOf: 0.01 }),
    },
  };
}

async function createOrganizations(currentUserId: string) {
  console.log("Creating organizations...");

  const organizations = [
    {
      name: "Glow Salon",
      industry: "beauty_salon",
      timezone: "America/New_York",
      owner_user_id: currentUserId,
    },
    {
      name: "Trim & Tonic",
      industry: "beauty_salon",
      timezone: "America/Los_Angeles",
      owner_user_id: currentUserId,
    },
  ];

  const { data: orgs, error } = await supabase
    .from("orgs")
    .insert(organizations)
    .select("id, name");

  if (error) throw error;
  console.log(`Created ${orgs.length} organizations`);

  // Create user_org_roles for owner
  const roleInserts = orgs.map((org) => ({
    user_id: currentUserId,
    org_id: org.id,
    role: "owner",
  }));

  const { error: rolesError } = await supabase
    .from("user_org_roles")
    .insert(roleInserts);

  if (rolesError) throw rolesError;
  console.log("Created organization roles");

  return orgs;
}

async function createAccountsForOrg(orgId: string, orgName: string) {
  console.log(`Creating accounts for ${orgName}...`);

  // Create a mock connection first
  const { data: connection, error: connectionError } = await supabase
    .from("connections")
    .insert({
      org_id: orgId,
      provider: "manual",
      status: "connected",
      scopes: ["transactions"],
    })
    .select("id")
    .single();

  if (connectionError) throw connectionError;

  // Create checking and business credit card accounts
  const accounts = [
    {
      org_id: orgId,
      connection_id: connection.id,
      provider_account_id: `manual_checking_${faker.string.alphanumeric(8)}`,
      name: `${orgName} Business Checking`,
      type: "depository",
      currency: "USD",
      is_active: true,
    },
    {
      org_id: orgId,
      connection_id: connection.id,
      provider_account_id: `manual_credit_${faker.string.alphanumeric(8)}`,
      name: `${orgName} Business Credit Card`,
      type: "credit",
      currency: "USD",
      is_active: true,
    },
  ];

  const { data: createdAccounts, error: accountsError } = await supabase
    .from("accounts")
    .insert(accounts)
    .select("id, name, type");

  if (accountsError) throw accountsError;
  console.log(`Created ${createdAccounts.length} accounts for ${orgName}`);

  return createdAccounts;
}

async function getCategories() {
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .is("org_id", null); // Get global categories

  if (error) throw error;
  return categories;
}

async function generateTransactionsForOrg(
  orgId: string,
  orgName: string,
  accounts: any[],
  categories: any[],
) {
  console.log(`Generating transactions for ${orgName}...`);

  const transactions = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90); // 90 days ago

  const revenueCategories = categories.filter(
    (c) => c.parent_id === "550e8400-e29b-41d4-a716-446655440001", // Revenue parent
  );
  const expenseCategories = categories.filter(
    (c) => c.parent_id === "550e8400-e29b-41d4-a716-446655440010", // Expenses parent
  );

  const checkingAccount = accounts.find((a) => a.type === "depository")!;
  const creditAccount = accounts.find((a) => a.type === "credit")!;

  // Generate approximately 200 transactions per org (mix of revenue and expenses)
  for (let i = 0; i < 200; i++) {
    const isRevenue = faker.datatype.boolean({ probability: 0.4 }); // 40% revenue, 60% expenses
    const transactionDate = faker.date.between({
      from: startDate,
      to: new Date(),
    });

    let description: string;
    let merchantName: string;
    let amountCents: number;
    let categoryId: string;
    let accountId: string;

    if (isRevenue) {
      // Revenue transaction
      const service = getRandomElement(REVENUE_SERVICES);
      const category = getRandomElement(revenueCategories);

      description = service;
      merchantName = orgName;
      amountCents = generateAmount("revenue", service);
      categoryId = category.id;
      accountId = checkingAccount.id; // Revenue goes to checking
    } else {
      // Expense transaction
      const category = getRandomElement(expenseCategories);
      let vendorPool: string[] = [];

      // Select appropriate vendor based on category
      if (category.name.includes("Rent")) vendorPool = SALON_VENDORS.rent;
      else if (category.name.includes("Utilities"))
        vendorPool = SALON_VENDORS.utilities;
      else if (category.name.includes("Supplies"))
        vendorPool = SALON_VENDORS.supplies;
      else if (category.name.includes("Equipment"))
        vendorPool = SALON_VENDORS.equipment;
      else if (category.name.includes("Software"))
        vendorPool = SALON_VENDORS.software;
      else if (category.name.includes("Marketing"))
        vendorPool = SALON_VENDORS.marketing;
      else if (category.name.includes("Insurance"))
        vendorPool = SALON_VENDORS.insurance;
      else if (category.name.includes("Professional"))
        vendorPool = SALON_VENDORS.professional;
      else if (category.name.includes("Bank Fees"))
        vendorPool = SALON_VENDORS.pos_fees;
      else vendorPool = SALON_VENDORS.supplies; // Default fallback

      merchantName = getRandomElement(vendorPool);
      description = `${category.name} - ${merchantName}`;
      amountCents = generateAmount("expense", category.name);
      categoryId = category.id;

      // 70% of expenses on credit card, 30% on checking
      accountId = faker.datatype.boolean({ probability: 0.7 })
        ? creditAccount.id
        : checkingAccount.id;
    }

    const transaction = {
      org_id: orgId,
      account_id: accountId,
      date: transactionDate.toISOString().split("T")[0], // YYYY-MM-DD format
      amount_cents: amountCents,
      currency: "USD",
      description,
      merchant_name: merchantName,
      mcc: null,
      raw: generateRawPayload(description, amountCents, merchantName),
      category_id: categoryId,
      confidence: faker.number.float({
        min: 0.75,
        max: 0.95,
        multipleOf: 0.01,
      }),
      source: "manual",
      receipt_id: null,
      reviewed: faker.datatype.boolean({ probability: 0.3 }), // 30% reviewed
    };

    transactions.push(transaction);
  }

  // Insert transactions in batches of 50 to avoid query size limits
  const batchSize = 50;
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const { error } = await supabase.from("transactions").insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      throw error;
    }
  }

  console.log(`Generated ${transactions.length} transactions for ${orgName}`);
  return transactions;
}

async function main() {
  try {
    console.log("Starting seed process...");

    // Since we're using service role key, query for existing users or create a demo user
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    let currentUserId: string;

    if (usersError || !existingUsers || existingUsers.length === 0) {
      // No users found, create a demo user for seeding
      console.log('No users found, creating demo user...');
      
      // First create the user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: 'demo@nexus.com',
        password: 'demo123!@#',
        email_confirm: true,
        user_metadata: {
          name: 'Demo User'
        }
      });
      
      if (authError || !authUser.user) {
        throw new Error(`Failed to create auth user: ${authError?.message || 'Unknown error'}`);
      }
      
      // Then create the user record in our users table
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: 'demo@nexus.com',
          name: 'Demo User',
        });
      
      if (createUserError) {
        throw new Error(`Failed to create demo user: ${createUserError.message}`);
      }
      
      currentUserId = authUser.user.id;
      console.log(`Created demo user: ${currentUserId}`);
    } else {
      currentUserId = existingUsers[0]!.id;
      console.log(`Using existing user: ${currentUserId}`);
    }

    console.log(`Seeding data for user: ${currentUserId}`);

    // Create organizations
    const organizations = await createOrganizations(currentUserId);

    // Get global categories
    const categories = await getCategories();
    console.log(`Found ${categories.length} categories`);

    // Process each organization
    for (const org of organizations) {
      const accounts = await createAccountsForOrg(org.id, org.name);
      await generateTransactionsForOrg(org.id, org.name, accounts, categories);
    }

    console.log("✅ Seeding completed successfully!");
    console.log(
      `Created ${organizations.length} organizations with ~200 transactions each`,
    );
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run the seeding script
main();
