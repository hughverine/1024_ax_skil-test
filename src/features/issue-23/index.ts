/**
 * Anti-Reuse Detection Module
 * Issue #23: 既存問題の流用/類似検出（改題義務）
 *
 * Detects similarity between new and existing questions using n-gram Jaccard similarity
 */

export type SimilarityResult = {
  similarity: number;
  isDuplicate: boolean;
  threshold: number;
  method: "jaccard" | "cosine";
};

/**
 * Generate n-grams from text
 */
function generateNGrams(text: string, n: number = 5): Set<string> {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const ngrams = new Set<string>();

  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.add(normalized.substring(i, i + n));
  }

  return ngrams;
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Detect similarity between new question and existing questions
 *
 * @param newQuestion - The new question text to check
 * @param existingQuestions - Array of existing question texts
 * @param threshold - Similarity threshold (default: 0.7)
 * @param ngramSize - N-gram size (default: 5)
 * @returns Similarity result with highest match
 */
export function detectSimilarity(
  newQuestion: string,
  existingQuestions: string[],
  threshold: number = 0.7,
  ngramSize: number = 5
): SimilarityResult {
  const newNGrams = generateNGrams(newQuestion, ngramSize);
  let maxSimilarity = 0;

  for (const existing of existingQuestions) {
    const existingNGrams = generateNGrams(existing, ngramSize);
    const similarity = jaccardSimilarity(newNGrams, existingNGrams);

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
    }
  }

  return {
    similarity: maxSimilarity,
    isDuplicate: maxSimilarity >= threshold,
    threshold,
    method: "jaccard",
  };
}

/**
 * Check if question should be regenerated
 *
 * @param result - Similarity result
 * @returns True if regeneration is needed
 */
export function shouldRegenerate(result: SimilarityResult): boolean {
  return result.isDuplicate;
}

/**
 * Retry logic with fallback to static questions
 *
 * @param generateFn - Function to generate new question
 * @param checkFn - Function to check similarity
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param fallbackQuestion - Static fallback question
 * @returns Generated or fallback question
 */
export async function generateWithRetry<T>(
  generateFn: () => Promise<T>,
  checkFn: (question: T) => Promise<SimilarityResult>,
  maxRetries: number = 3,
  fallbackQuestion?: T
): Promise<{ question: T; retries: number; usedFallback: boolean }> {
  for (let i = 0; i < maxRetries; i++) {
    const question = await generateFn();
    const result = await checkFn(question);

    if (!result.isDuplicate) {
      return { question, retries: i, usedFallback: false };
    }
  }

  // Max retries exceeded, use fallback
  if (!fallbackQuestion) {
    throw new Error("Max retries exceeded and no fallback question provided");
  }

  return { question: fallbackQuestion, retries: maxRetries, usedFallback: true };
}