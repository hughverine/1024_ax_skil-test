-- AXCAMP Storage Configuration
-- Issue #17: RLS/Storage/バケット設計
-- Storage bucket for PDF reports

-- ============================================================================
-- Create Storage Bucket: reports (Private)
-- ============================================================================
-- Note: This is typically done via Supabase Dashboard or CLI
-- SQL representation for documentation purposes

-- insert into storage.buckets (id, name, public)
-- values ('reports', 'reports', false);

-- ============================================================================
-- Storage RLS Policies
-- ============================================================================
-- Only service role can upload/read reports
-- Users receive signed URLs from BFF

-- Allow service role to upload reports
-- create policy "Service role can upload reports"
-- on storage.objects for insert
-- with check (
--   bucket_id = 'reports'
--   and auth.role() = 'service_role'
-- );

-- Allow service role to read reports
-- create policy "Service role can read reports"
-- on storage.objects for select
-- using (
--   bucket_id = 'reports'
--   and auth.role() = 'service_role'
-- );

-- ============================================================================
-- Signed URL Generation (BFF only)
-- ============================================================================
-- BFF generates signed URLs for users to download their reports
-- Example usage in TypeScript:
--
-- import { sbAdmin } from '@/lib/supabase'
--
-- const { data, error } = await sbAdmin
--   .storage
--   .from('reports')
--   .createSignedUrl('path/to/report.pdf', 3600) // 1 hour expiry
--
-- Users access reports via signed URLs only, never directly

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Create bucket via Supabase Dashboard:
--    Storage > New Bucket > Name: "reports" > Private
--
-- 2. RLS policies are applied automatically via Dashboard
--
-- 3. Signed URLs expire after configured time (e.g., 1 hour)
--
-- 4. PDF upload path format: {session_id}/{report_type}.pdf
--    Example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890/individual.pdf'
--
-- 5. File size limits: Configure in Supabase Dashboard
--    Recommended: 10MB max for PDF reports
