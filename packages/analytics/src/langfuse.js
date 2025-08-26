let langfuseInstance = null;
/**
 * Get Langfuse client instance (server-only)
 * Returns null if running in browser or if credentials are missing
 */
export function getLangfuse() {
    // Only initialize in server environment
    if (typeof window !== 'undefined') {
        console.warn('Langfuse is server-only and cannot be used in browser environment');
        return null;
    }
    if (!langfuseInstance) {
        const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
        const secretKey = process.env.LANGFUSE_SECRET_KEY;
        const baseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';
        if (!publicKey || !secretKey) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Langfuse keys not found in environment variables (LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY)');
                return null;
            }
            throw new Error('Langfuse keys are required in production');
        }
        try {
            const { Langfuse } = require('langfuse');
            langfuseInstance = new Langfuse({
                publicKey,
                secretKey,
                baseUrl,
            });
        }
        catch (error) {
            console.error('Failed to initialize Langfuse client:', error);
            return null;
        }
    }
    return langfuseInstance;
}
/**
 * Helper to create a new trace with Langfuse
 * Returns null if Langfuse is not available
 */
export function createTrace(name, input, metadata) {
    const langfuse = getLangfuse();
    if (!langfuse) {
        return null;
    }
    try {
        return langfuse.trace({
            name,
            input,
            metadata,
        });
    }
    catch (error) {
        console.error('Failed to create Langfuse trace:', error);
        return null;
    }
}
/**
 * Helper to create a new generation (for LLM calls)
 * Returns null if Langfuse is not available
 */
export function createGeneration(traceId, name, input, metadata) {
    const langfuse = getLangfuse();
    if (!langfuse) {
        return null;
    }
    try {
        return langfuse.generation({
            traceId,
            name,
            input,
            metadata,
        });
    }
    catch (error) {
        console.error('Failed to create Langfuse generation:', error);
        return null;
    }
}
/**
 * Helper to score a trace or generation
 */
export function scoreTrace(traceId, name, value, comment) {
    const langfuse = getLangfuse();
    if (!langfuse) {
        return;
    }
    try {
        const scoreData = {
            traceId,
            name,
            value,
        };
        if (comment !== undefined) {
            scoreData.comment = comment;
        }
        langfuse.score(scoreData);
    }
    catch (error) {
        console.error('Failed to score Langfuse trace:', error);
    }
}
/**
 * Gracefully shutdown Langfuse client
 * Should be called when server is shutting down
 */
export async function shutdownLangfuse() {
    if (langfuseInstance) {
        try {
            await langfuseInstance.shutdownAsync();
            langfuseInstance = null;
        }
        catch (error) {
            console.error('Error shutting down Langfuse client:', error);
        }
    }
}
//# sourceMappingURL=langfuse.js.map