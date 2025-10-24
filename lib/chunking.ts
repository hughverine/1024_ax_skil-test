/**
 * Text Chunking Utilities
 * Issue #18: YAML → チャンク → 埋め込み → Supabase格納
 */

export interface ChunkOptions {
  /** Target chunk size in characters (default: 1500) */
  chunkSize?: number;
  /** Overlap between chunks in characters (default: 200) */
  overlap?: number;
}

export interface TextChunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
}

/**
 * Split text into overlapping chunks
 *
 * @param text - The text to split
 * @param options - Chunking options
 * @returns Array of text chunks
 *
 * @example
 * ```ts
 * const chunks = splitIntoChunks("Long text...", { chunkSize: 1000, overlap: 200 });
 * ```
 */
export function splitIntoChunks(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const { chunkSize = 1500, overlap = 200 } = options;

  if (text.length <= chunkSize) {
    return [
      {
        text,
        index: 0,
        startChar: 0,
        endChar: text.length,
      },
    ];
  }

  const chunks: TextChunk[] = [];
  let startChar = 0;
  let index = 0;

  while (startChar < text.length) {
    let endChar = startChar + chunkSize;

    // If this is not the last chunk, try to break at a sentence boundary
    if (endChar < text.length) {
      const sentenceEndings = /[。！？\.\!\?]\s/g;
      const textSlice = text.substring(startChar, endChar + 100); // Look ahead a bit
      const matches = Array.from(textSlice.matchAll(sentenceEndings));

      if (matches.length > 0) {
        // Find the last sentence ending within the chunk
        const lastMatch = matches[matches.length - 1];
        if (lastMatch.index !== undefined) {
          endChar = startChar + lastMatch.index + lastMatch[0].length;
        }
      }
    } else {
      endChar = text.length;
    }

    chunks.push({
      text: text.substring(startChar, endChar).trim(),
      index,
      startChar,
      endChar,
    });

    // Move start position for next chunk (with overlap)
    startChar = endChar - overlap;
    index++;

    // Avoid infinite loop
    if (startChar >= text.length) break;
  }

  return chunks;
}

/**
 * Calculate recommended chunk size based on text length
 */
export function getRecommendedChunkSize(textLength: number): number {
  if (textLength < 2000) return 1000;
  if (textLength < 10000) return 1500;
  return 2000;
}

/**
 * Estimate token count (rough approximation)
 * 1 token ≈ 4 characters for English, 1-2 characters for Japanese
 */
export function estimateTokenCount(text: string): number {
  // Simple heuristic: count Japanese chars as 1.5 chars, others as 4
  const japaneseChars = text.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g)?.length || 0;
  const otherChars = text.length - japaneseChars;

  return Math.ceil(japaneseChars / 1.5 + otherChars / 4);
}
