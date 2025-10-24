/**
 * Knowledge Loader Script
 * Issue #18: YAML → チャンク → 埋め込み → Supabase格納
 *
 * Loads YAML curriculum files, chunks them, generates embeddings,
 * and stores them in Supabase for RAG (Retrieval-Augmented Generation)
 *
 * Usage:
 *   tsx scripts/load-knowledge.ts
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import YAML from "yaml";
import { sbAdmin } from "../lib/supabase";
import { splitIntoChunks, estimateTokenCount } from "../lib/chunking";
import { generateEmbeddingsBatch, EMBEDDING_DIMENSIONS } from "../lib/embeddings";

const PROMPTS_DIR = path.join(process.cwd(), "prompts", "curriculum");

interface KnowledgeEntry {
  type?: string;
  category?: string;
  subcategory?: string;
  summary?: string;
  key_points?: string[];
  content?: string;
  解説?: string;
}

interface KnowledgeSource {
  id: string;
  source_name: string;
  source_type: string;
  content_hash: string;
  uploaded_at: string;
}

interface KnowledgeChunkInsert {
  source_id: string;
  chunk_index: number;
  category: string;
  subcategory?: string;
  content: string;
  embedding: string; // pgvector format: '[0.1, 0.2, ...]'
}

async function loadYAMLFiles(): Promise<{ filePath: string; content: any }[]> {
  try {
    const files = await fs.readdir(PROMPTS_DIR);
    const yamlFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

    console.log(`📂 Found ${yamlFiles.length} YAML files in ${PROMPTS_DIR}`);

    const results = [];
    for (const file of yamlFiles) {
      const filePath = path.join(PROMPTS_DIR, file);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const parsed = YAML.parse(fileContent);

      results.push({ filePath, content: parsed });
      console.log(`   ✓ Loaded: ${file}`);
    }

    return results;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.warn(`⚠️  Directory not found: ${PROMPTS_DIR}`);
      console.warn(`   Creating directory and returning empty results...`);
      await fs.mkdir(PROMPTS_DIR, { recursive: true });
      return [];
    }
    throw error;
  }
}

function extractKnowledgeFromYAML(content: any): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = [];

  // Handle array of entries
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.type === "knowledge" || item.summary || item.key_points || item.解説) {
        entries.push(item);
      }
    }
  }
  // Handle single object
  else if (typeof content === "object") {
    if (content.type === "knowledge" || content.summary || content.key_points || content.解説) {
      entries.push(content);
    }
    // Handle nested structure
    for (const key of Object.keys(content)) {
      if (typeof content[key] === "object") {
        entries.push(...extractKnowledgeFromYAML(content[key]));
      }
    }
  }

  return entries;
}

function knowledgeEntryToText(entry: KnowledgeEntry): string {
  const parts: string[] = [];

  if (entry.category) parts.push(`カテゴリ: ${entry.category}`);
  if (entry.subcategory) parts.push(`サブカテゴリ: ${entry.subcategory}`);
  if (entry.summary) parts.push(`概要: ${entry.summary}`);
  if (entry.key_points && entry.key_points.length > 0) {
    parts.push(`ポイント:\n${entry.key_points.map((p) => `- ${p}`).join("\n")}`);
  }
  if (entry.content) parts.push(entry.content);
  if (entry.解説) parts.push(`解説: ${entry.解説}`);

  return parts.join("\n\n");
}

async function main() {
  console.log("🚀 Knowledge Loader - Starting...\n");

  // 1. Load YAML files
  const yamlFiles = await loadYAMLFiles();

  if (yamlFiles.length === 0) {
    console.log("\n⚠️  No YAML files found. Please add curriculum files to:");
    console.log(`   ${PROMPTS_DIR}`);
    console.log("\nExample: prompts/curriculum/example.yaml");
    console.log("---");
    console.log("- type: knowledge");
    console.log("  category: 経営戦略");
    console.log("  summary: 経営戦略の基礎概念");
    console.log("  key_points:");
    console.log("    - SWOT分析の活用");
    console.log("    - ポーターの5つの力");
    return;
  }

  let totalChunks = 0;
  let totalSources = 0;

  for (const { filePath, content } of yamlFiles) {
    const fileName = path.basename(filePath);
    console.log(`\n📄 Processing: ${fileName}`);

    // 2. Extract knowledge entries
    const knowledgeEntries = extractKnowledgeFromYAML(content);
    console.log(`   Found ${knowledgeEntries.length} knowledge entries`);

    if (knowledgeEntries.length === 0) continue;

    // 3. Create knowledge source record
    const fullText = knowledgeEntries.map(knowledgeEntryToText).join("\n\n---\n\n");
    const contentHash = crypto.createHash("sha256").update(fullText).digest("hex");

    // Check if already loaded
    const { data: existingSource } = await sbAdmin
      .from("knowledge_sources")
      .select("id")
      .eq("content_hash", contentHash)
      .single();

    if (existingSource) {
      console.log(`   ⏭️  Already loaded (hash: ${contentHash.substring(0, 8)}...)`);
      continue;
    }

    const { data: sourceData, error: sourceError } = await sbAdmin
      .from("knowledge_sources")
      .insert({
        source_name: fileName,
        source_type: "yaml",
        content_hash: contentHash,
      })
      .select()
      .single();

    if (sourceError || !sourceData) {
      console.error(`   ❌ Failed to create source: ${sourceError?.message}`);
      continue;
    }

    const source = sourceData as KnowledgeSource;
    totalSources++;
    console.log(`   ✓ Created source: ${source.id}`);

    // 4. Chunk text
    const chunks = splitIntoChunks(fullText, { chunkSize: 1500, overlap: 200 });
    console.log(`   ✓ Created ${chunks.length} chunks`);

    // 5. Generate embeddings
    console.log(`   🧠 Generating embeddings...`);
    const embeddings = await generateEmbeddingsBatch(
      chunks.map((c) => c.text),
      50 // Batch size
    );

    // 6. Insert chunks with embeddings
    const chunksToInsert: KnowledgeChunkInsert[] = embeddings.map((emb, idx) => ({
      source_id: source.id,
      chunk_index: idx,
      category: knowledgeEntries[0]?.category || "general",
      subcategory: knowledgeEntries[0]?.subcategory,
      content: emb.text,
      embedding: `[${emb.embedding.join(",")}]`, // pgvector format
    }));

    const { error: chunksError } = await sbAdmin
      .from("knowledge_chunks")
      .insert(chunksToInsert);

    if (chunksError) {
      console.error(`   ❌ Failed to insert chunks: ${chunksError.message}`);
      continue;
    }

    totalChunks += chunks.length;
    console.log(`   ✓ Inserted ${chunks.length} chunks with embeddings`);

    // Stats
    const avgTokens = chunks.reduce((sum, c) => sum + estimateTokenCount(c.text), 0) / chunks.length;
    console.log(`   📊 Avg tokens per chunk: ${Math.round(avgTokens)}`);
  }

  console.log("\n✅ Knowledge loading completed!");
  console.log(`   Total sources: ${totalSources}`);
  console.log(`   Total chunks: ${totalChunks}`);
  console.log(`   Embedding dimensions: ${EMBEDDING_DIMENSIONS}`);
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
