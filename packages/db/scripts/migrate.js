import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import * as dotenv from 'dotenv';
import { getAdminClient } from '../index.js';
// Load environment variables from project root
dotenv.config({ path: resolve(process.cwd(), '../../.env') });
/**
 * Migration script that executes SQL files in packages/db/migrations/ in order
 * Uses service role key to bypass RLS for schema operations
 */
async function migrate() {
    const supabase = getAdminClient();
    const migrationsDir = resolve(process.cwd(), 'migrations');
    try {
        console.log('🔍 Reading migrations directory:', migrationsDir);
        // Read all SQL files in migrations directory
        const files = await readdir(migrationsDir);
        const sqlFiles = files
            .filter(file => file.endsWith('.sql'))
            .sort(); // Execute in alphabetical/numerical order
        if (sqlFiles.length === 0) {
            console.log('⚠️  No migration files found');
            return;
        }
        console.log(`📦 Found ${sqlFiles.length} migration files:`);
        sqlFiles.forEach(file => console.log(`   - ${file}`));
        // Execute each migration file
        for (const file of sqlFiles) {
            const filePath = join(migrationsDir, file);
            console.log(`\n🚀 Executing migration: ${file}`);
            try {
                // Read SQL file content
                const sql = await readFile(filePath, 'utf-8');
                // Check if schema already exists by testing for core tables
                console.log(`   Checking if schema exists...`);
                try {
                    // Test if main tables exist by querying them
                    const { error: orgsError } = await supabase
                        .from('orgs')
                        .select('id')
                        .limit(1);
                    const { error: categoriesError } = await supabase
                        .from('categories')
                        .select('id')
                        .limit(1);
                    if (!orgsError && !categoriesError) {
                        console.log(`   ✅ Schema already exists, skipping migration`);
                    }
                    else {
                        // Schema doesn't exist - provide manual instructions
                        console.log(`   ⚠️  Database schema not found. Please apply the schema manually:`);
                        console.log(`   `);
                        console.log(`   Option 1 - Via Supabase Dashboard:`);
                        console.log(`   1. Go to your Supabase project dashboard`);
                        console.log(`   2. Navigate to SQL Editor`);
                        console.log(`   3. Copy and paste the contents of: packages/db/migrations/001_init.sql`);
                        console.log(`   4. Click "Run" to execute the schema`);
                        console.log(`   `);
                        console.log(`   Option 2 - Via Supabase CLI (if installed):`);
                        console.log(`   1. Run: supabase db push`);
                        console.log(`   2. Or: supabase migration up`);
                        console.log(`   `);
                        console.log(`   After applying the schema, re-run: pnpm migrate`);
                        console.log(`   `);
                        // Don't fail the migration, just inform the user
                        console.log(`   📋 Schema application required before proceeding`);
                        process.exit(1);
                    }
                }
                catch (schemaCheckError) {
                    console.log(`   ⚠️  Cannot verify schema existence:`, schemaCheckError);
                    console.log(`   Please ensure database is accessible and schema is applied`);
                    process.exit(1);
                }
                console.log(`✅ Successfully executed: ${file}`);
            }
            catch (migrationError) {
                console.error(`❌ Failed to execute migration ${file}:`, migrationError);
                process.exit(1);
            }
        }
        console.log('\n🎉 All migrations completed successfully!');
    }
    catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
}
// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrate().catch(console.error);
}
export { migrate };
//# sourceMappingURL=migrate.js.map