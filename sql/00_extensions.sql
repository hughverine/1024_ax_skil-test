-- Enable required PostgreSQL extensions
-- Issue #16: データモデルの作成（SQLマイグレーション）

-- Enable pgcrypto for UUID generation and encryption
create extension if not exists pgcrypto;

-- Enable pgvector for vector embeddings (RAG)
create extension if not exists vector with schema extensions;
