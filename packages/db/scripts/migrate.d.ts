/**
 * Migration script that executes SQL files in packages/db/migrations/ in order
 * Uses service role key to bypass RLS for schema operations
 */
declare function migrate(): Promise<void>;
export { migrate };
//# sourceMappingURL=migrate.d.ts.map