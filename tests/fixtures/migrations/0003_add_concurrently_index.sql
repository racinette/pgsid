-- Migration: 0003_add_concurrently_index
-- Demonstrates CONCURRENTLY stripping (the keyword is stripped so the
-- statement can run inside the apply transaction).

CREATE INDEX CONCURRENTLY posts_tags_gin ON public.posts USING gin (tags);

-- Also add a composite index concurrently.
CREATE INDEX CONCURRENTLY posts_user_published_idx
  ON public.posts (user_id, published_at DESC);
