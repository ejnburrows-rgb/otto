-- supabase/migrations/0002_photo_storage.sql
--
-- Creates the RLS policy for the Supabase Storage bucket that holds job photos.
--
-- BUCKET CREATION: the bucket itself ("job-photos", Public: OFF) must be created
-- through the Supabase dashboard (Storage → New bucket) or the Storage API before
-- this policy is applied, because Supabase does not support creating buckets via
-- SQL. This file handles only the RLS layer.
--
-- SECURITY MODEL:
--   - The bucket is private (Public: OFF in the dashboard).
--   - Anonymous (anon) access is explicitly denied by the policy below.
--   - The service-role key (held only in api/photos.js via Vercel env vars)
--     bypasses RLS automatically, so the server-side relay always works.
--   - No public key appears in index.html or any browser-visible file.
--
-- This follows the same pattern established on 2026-07-21 for the database
-- tables in 0001_init_schema.sql — the public is locked out outright, not
-- just rate-limited.
--
-- HOW TO APPLY:
--   1. In the Supabase dashboard: Storage → New bucket
--      Name: job-photos
--      Public: OFF (leave the toggle unchecked)
--   2. SQL Editor → paste this file → Run

BEGIN;

-- Belt-and-suspenders: deny the anon role direct access to any object in the
-- job-photos bucket. The service-role key (used by api/photos.js) is exempt
-- from RLS, so the server relay is unaffected.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'deny_anon_job_photos'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY deny_anon_job_photos ON storage.objects
        FOR ALL
        TO anon
        USING (bucket_id = 'job-photos' AND false);
    $policy$;
  END IF;
END $$;

COMMIT;
