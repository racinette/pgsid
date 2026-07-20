-- Migration: 0004_broken_migration
-- A migration with multiple errors to demonstrate the diagnostic pipeline:
--   1. A DDL error with a position (undefined column in WHERE predicate)
--   2. A PL/pgSQL function with a bad column reference (plpgsql_check)
--   3. A LANGUAGE sql function with a bad column (PG native validation)
--
-- Note: applyMigration halts on the FIRST error, so only the first
-- failing statement produces diagnostics. The remaining statements are
-- not attempted.

-- This DDL has a typo in the WHERE predicate: "publishd_at" instead of
-- "published_at". PG returns 42703 (undefined_column) with a position
-- pointing at the bad column.
CREATE INDEX posts_search_idx ON public.posts (title)
  WHERE publishd_at IS NOT NULL;
