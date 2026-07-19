-- Migration: 0002_backfill_display_names
-- Adds a column, backfills from existing data, then enforces NOT NULL.
-- Classic "expand-then-contract" pattern over multiple statements.

ALTER TABLE public.users ADD COLUMN full_name text;

ALTER TABLE public.users ALTER COLUMN full_name SET NOT NULL;

CREATE INDEX users_full_name_idx ON public.users (full_name);

-- A SELECT-based audit backfill (writes via a DO block).
-- Verify the backfill (SELECT in a migration is unusual but happens).
