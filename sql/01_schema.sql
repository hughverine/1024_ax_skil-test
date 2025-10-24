-- AXCAMP Database Schema
-- Issue #16: データモデルの作成（SQLマイグレーション）
-- Based on EPIC 1: Supabase スキーマ & RLS/Storage/インデックス

-- ============================================================================
-- 受講者情報（PII暗号化）
-- ============================================================================
create table participants (
  id uuid primary key default gen_random_uuid(),
  email_encrypted text not null, -- PII暗号化
  name_encrypted text not null,  -- PII暗号化
  company_encrypted text,         -- PII暗号化
  department_encrypted text,      -- PII暗号化
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on participants (created_at desc);

-- ============================================================================
-- テストセッション
-- ============================================================================
create table test_sessions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_score numeric(5,2), -- 0-100
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on test_sessions (participant_id, created_at desc);
create index on test_sessions (status);

-- ============================================================================
-- 問題（MCQ + 記述式）
-- ============================================================================
create table questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references test_sessions(id) on delete cascade,
  question_number int not null, -- 1-30
  question_type text not null check (question_type in ('mcq', 'essay')), -- MCQ or 記述式
  category text not null, -- カテゴリ（ナレッジベース由来）
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  question_text text not null,
  options jsonb, -- MCQの場合の選択肢 ["A", "B", "C", "D"]
  correct_answer text, -- MCQの正解
  rubric jsonb, -- 記述式の採点ルーブリック
  created_at timestamptz not null default now()
);

create unique index on questions (session_id, question_number);
create index on questions (session_id);

-- ============================================================================
-- 回答
-- ============================================================================
create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  answer_text text not null,
  is_correct boolean, -- MCQの正誤
  score numeric(5,2), -- 記述式の得点 (0-100)
  feedback text, -- AIによる解説・フィードバック
  answered_at timestamptz not null default now(),
  graded_at timestamptz
);

create unique index on answers (question_id);
create index on answers (answered_at);

-- ============================================================================
-- 補完質問
-- ============================================================================
create table followup_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references test_sessions(id) on delete cascade,
  question_number int not null, -- 31-35 (補完質問は2-5問)
  question_text text not null,
  category text not null,
  created_at timestamptz not null default now()
);

create unique index on followup_questions (session_id, question_number);
create index on followup_questions (session_id);

-- ============================================================================
-- 補完質問の回答
-- ============================================================================
create table followup_answers (
  id uuid primary key default gen_random_uuid(),
  followup_question_id uuid not null references followup_questions(id) on delete cascade,
  answer_text text not null,
  score numeric(5,2), -- 0-100
  feedback text,
  answered_at timestamptz not null default now(),
  graded_at timestamptz
);

create unique index on followup_answers (followup_question_id);
create index on followup_answers (answered_at);

-- ============================================================================
-- レポート
-- ============================================================================
create table reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references test_sessions(id) on delete cascade,
  report_type text not null check (report_type in ('individual', 'corporate')),
  final_score numeric(5,2) not null, -- 0-100
  category_scores jsonb not null, -- カテゴリ別スコア
  roi_calculation jsonb, -- 企業向けROI計算結果
  pdf_url text, -- Storage署名URL
  generated_at timestamptz not null default now()
);

create unique index on reports (session_id, report_type);
create index on reports (generated_at desc);

-- ============================================================================
-- メール送信履歴
-- ============================================================================
create table emails (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references test_sessions(id) on delete cascade,
  recipient_email text not null,
  email_type text not null check (email_type in ('individual_report', 'admin_notification')),
  subject text not null,
  body text not null,
  sent_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed'))
);

create index on emails (session_id);
create index on emails (sent_at desc);
create index on emails (status);

-- ============================================================================
-- ナレッジソース（RAG用）
-- ============================================================================
create table knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type text not null check (source_type in ('yaml', 'pdf', 'url')),
  content_hash text not null unique, -- デデュープ用
  uploaded_at timestamptz not null default now()
);

create index on knowledge_sources (uploaded_at desc);

-- ============================================================================
-- ナレッジチャンク（RAG用 + pgvector）
-- ============================================================================
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references knowledge_sources(id) on delete cascade,
  chunk_index int not null,
  category text not null,
  subcategory text,
  content text not null,
  embedding vector(1536), -- OpenAI text-embedding-3-small (1536 dimensions)
  created_at timestamptz not null default now()
);

create unique index on knowledge_chunks (source_id, chunk_index);
create index on knowledge_chunks (category);
create index on knowledge_chunks (created_at);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_participants_updated_at
  before update on participants
  for each row execute function update_updated_at();

create trigger update_test_sessions_updated_at
  before update on test_sessions
  for each row execute function update_updated_at();
