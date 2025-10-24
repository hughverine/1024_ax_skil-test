/**
 * OpenAI Embeddings Utilities
 * Issue #18: YAML → チャンク → 埋め込み → Supabase格納
 */

import { oai } from "./openai";

export const EMBEDDING_MODEL = "text-embedding-3-large";
export const EMBEDDING_DIMENSIONS = 3072;

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  model: string;
  dimensions: number;
}

/**
 * Generate embedding for a single text
 *
 * @param text - Text to embed
 * @returns Embedding vector (3072 dimensions)
 */
export async function generateEmbedding(
  text: string
): Promise<EmbeddingResult> {
  const response = await oai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return {
    embedding: response.data[0].embedding,
    text,
    model: EMBEDDING_MODEL,
    dimensions: response.data[0].embedding.length,
  };
}

/**
 * Generate embeddings for multiple texts in batch
 * OpenAI API supports up to 2048 texts per request
 *
 * @param texts - Array of texts to embed
 * @param batchSize - Number of texts per API call (default: 100)
 * @returns Array of embeddings
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 100
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    console.log(
      `Generating embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}...`
    );

    const response = await oai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    for (let j = 0; j < response.data.length; j++) {
      results.push({
        embedding: response.data[j].embedding,
        text: batch[j],
        model: EMBEDDING_MODEL,
        dimensions: response.data[j].embedding.length,
      });
    }

    // Add small delay between batches to avoid rate limits
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Calculate cosine similarity between two embeddings
 * Used for testing and validation
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimensions");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
