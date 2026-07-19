-- Migration: 0002_backfill_display_names
-- Adds a column, backfills from existing data, then enforces NOT NULL.
-- Classic "expand-then-contract" pattern over multiple statements.

ALTER TABLE public.users ADD COLUMN full_name text;

UPDATE public.users
SET full_name = display_name
WHERE full_name IS NULL AND display_name IS NOT NULL;

UPDATE public.users
SET full_name = split_part(email, '@', 1)
WHERE full_name IS NULL;

ALTER TABLE public.users ALTER COLUMN full_name SET NOT NULL;

CREATE INDEX users_full_name_idx ON public.users (full_name);

-- A SELECT-based audit backfill (writes via a DO block).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE published_at IS NOT NULL) THEN
    RAISE NOTICE 'No published posts yet, skipping audit seed.';
  END IF;
END
$$;

-- Verify the backfill (SELECT in a migration is unusual but happens).
SELECT id, full_name FROM public.users ORDER BY id LIMIT 10;
