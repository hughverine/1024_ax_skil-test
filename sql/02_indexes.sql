-- AXCAMP pgvector Indexes
-- Issue #16: データモデルの作成（SQLマイグレーション）
-- IVFFLAT index for semantic search (RAG)

-- ============================================================================
-- pgvector IVFFLAT index for knowledge_chunks
-- ============================================================================
-- This index enables fast approximate nearest neighbor search
-- for semantic similarity queries using cosine distance
--
-- Parameters:
-- - lists = 100: Number of inverted lists (good for ~100k rows)
--   Adjust based on dataset size:
--   - Small dataset (<10k rows): lists = 10-50
--   - Medium dataset (10k-100k rows): lists = 50-100
--   - Large dataset (>100k rows): lists = 100-1000
--
-- Performance: O(sqrt(n)) vs O(n) for sequential scan
--
create index knowledge_chunks_embedding_idx
  on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Build the index AFTER inserting data for better performance
-- 2. For better accuracy, increase `lists` value
-- 3. Query performance can be tuned with SET ivfflat.probes = N;
--    (default probes = 1, higher = more accurate but slower)
-- 4. Consider using HNSW index for better performance (Supabase pg 15+):
--    create index on knowledge_chunks using hnsw (embedding vector_cosine_ops);
