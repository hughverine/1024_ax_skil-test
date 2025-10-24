# AXCAMP SQL Migrations

SQL migration files for Supabase database setup.

## Issues

- **Issue #16**: データモデルの作成（SQLマイグレーション）
- **Issue #17**: RLS/Storage/バケット設計

## Execution Order

Run these files in order via Supabase SQL Editor:

### 1. Extensions (`00_extensions.sql`)
Enable required PostgreSQL extensions:
- `pgcrypto` - UUID generation and encryption
- `vector` - pgvector for embeddings (RAG)

```bash
# Via Supabase Dashboard
# SQL Editor > New Query > Paste contents of 00_extensions.sql > Run
```

### 2. Schema (`01_schema.sql`)
Create all tables:
- `participants` - 受講者情報（PII暗号化）
- `test_sessions` - テストセッション
- `questions` / `answers` - 問題と回答
- `followup_questions` / `followup_answers` - 補完質問
- `reports` - レポート
- `emails` - メール送信履歴
- `knowledge_sources` / `knowledge_chunks` - RAG用ナレッジ

```bash
# Via Supabase Dashboard
# SQL Editor > New Query > Paste contents of 01_schema.sql > Run
```

### 3. Indexes (`02_indexes.sql`)
Create pgvector IVFFLAT index for semantic search:

```bash
# Via Supabase Dashboard
# SQL Editor > New Query > Paste contents of 02_indexes.sql > Run
```

**Note**: Build the index AFTER inserting data for better performance.

### 4. RLS (`03_rls.sql`)
Enable Row Level Security on all tables:

```bash
# Via Supabase Dashboard
# SQL Editor > New Query > Paste contents of 03_rls.sql > Run
```

### 5. Storage (`04_storage.sql`)
Create Storage bucket for PDF reports:

```bash
# Via Supabase Dashboard
# Storage > New Bucket > Name: "reports" > Private: true
```

**Note**: `04_storage.sql` is for documentation. Create bucket via Dashboard.

## Verification

After running all migrations:

```sql
-- Check extensions
select * from pg_extension where extname in ('pgcrypto', 'vector');

-- Check tables
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;

-- Check pgvector index
select * from pg_indexes where indexname = 'knowledge_chunks_embedding_idx';

-- Check RLS
select tablename, rowsecurity from pg_tables where schemaname = 'public';

-- Check storage buckets
select * from storage.buckets where name = 'reports';
```

## Local Development

For local development with Supabase CLI:

```bash
# Initialize Supabase
supabase init

# Start local Supabase
supabase start

# Run migrations
supabase db reset

# Or run individual files
psql -h localhost -p 54322 -U postgres -d postgres -f sql/00_extensions.sql
psql -h localhost -p 54322 -U postgres -d postgres -f sql/01_schema.sql
psql -h localhost -p 54322 -U postgres -d postgres -f sql/02_indexes.sql
psql -h localhost -p 54322 -U postgres -d postgres -f sql/03_rls.sql
```

## pgvector Performance

The IVFFLAT index parameters can be tuned:

```sql
-- For small datasets (<10k rows)
create index on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- For medium datasets (10k-100k rows)
create index on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- For large datasets (>100k rows)
create index on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 1000);
```

Query performance tuning:

```sql
-- Increase accuracy (default probes = 1)
SET ivfflat.probes = 10;

-- Then run your semantic search query
SELECT * FROM knowledge_chunks
ORDER BY embedding <=> $1
LIMIT 10;
```

## References

- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage/buckets/fundamentals)
