import type { Langfuse } from 'langfuse';
/**
 * Get Langfuse client instance (server-only)
 * Returns null if running in browser or if credentials are missing
 */
export declare function getLangfuse(): Langfuse | null;
/**
 * Helper to create a new trace with Langfuse
 * Returns null if Langfuse is not available
 */
export declare function createTrace(name: string, input?: any, metadata?: Record<string, any>): import("langfuse").LangfuseTraceClient | null;
/**
 * Helper to create a new generation (for LLM calls)
 * Returns null if Langfuse is not available
 */
export declare function createGeneration(traceId: string, name: string, input?: any, metadata?: Record<string, any>): import("langfuse").LangfuseGenerationClient | null;
/**
 * Helper to score a trace or generation
 */
export declare function scoreTrace(traceId: string, name: string, value: number, comment?: string | null): void;
/**
 * Gracefully shutdown Langfuse client
 * Should be called when server is shutting down
 */
export declare function shutdownLangfuse(): Promise<void>;
//# sourceMappingURL=langfuse.d.ts.map