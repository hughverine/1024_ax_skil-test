/**
 * OpenAI Timeout/Retry/Fallback - Issue #34
 */

export async function callOpenAIWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await Promise.race([fn(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000))]);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
  throw new Error("Max retries exceeded");
}
