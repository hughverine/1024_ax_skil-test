-- AXCAMP Row Level Security (RLS)
-- Issue #17: RLS/Storage/バケット設計
-- Security: サービスロール経由のみアクセス可能

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
alter table participants enable row level security;
alter table test_sessions enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table followup_questions enable row level security;
alter table followup_answers enable row level security;
alter table reports enable row level security;
alter table emails enable row level security;
alter table knowledge_sources enable row level security;
alter table knowledge_chunks enable row level security;

-- ============================================================================
-- RLS Policies: Service Role Only
-- ============================================================================
-- デフォルトでは全てのアクセスを拒否
-- BFF（サービスロール）経由のみアクセス可能

-- Participants
create policy "Service role only" on participants
  for all using (auth.role() = 'service_role');

-- Test Sessions
create policy "Service role only" on test_sessions
  for all using (auth.role() = 'service_role');

-- Questions
create policy "Service role only" on questions
  for all using (auth.role() = 'service_role');

-- Answers
create policy "Service role only" on answers
  for all using (auth.role() = 'service_role');

-- Followup Questions
create policy "Service role only" on followup_questions
  for all using (auth.role() = 'service_role');

-- Followup Answers
create policy "Service role only" on followup_answers
  for all using (auth.role() = 'service_role');

-- Reports
create policy "Service role only" on reports
  for all using (auth.role() = 'service_role');

-- Emails
create policy "Service role only" on emails
  for all using (auth.role() = 'service_role');

-- Knowledge Sources
create policy "Service role only" on knowledge_sources
  for all using (auth.role() = 'service_role');

-- Knowledge Chunks
create policy "Service role only" on knowledge_chunks
  for all using (auth.role() = 'service_role');

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. All access must go through the BFF (Backend for Frontend)
-- 2. BFF uses SUPABASE_SERVICE_ROLE_KEY for server-side operations
-- 3. Anonymous users have no direct database access
-- 4. This ensures PII encryption is handled by the BFF layer
