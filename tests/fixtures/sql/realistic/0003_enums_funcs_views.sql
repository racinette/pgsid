-- Migration: 0003_enums_funcs_views
-- Enum, sql function, plpgsql function, view.

CREATE TYPE public.post_status AS ENUM (
  'draft',
  'published',
  'archived'
);

ALTER TABLE public.posts ADD COLUMN status public.post_status NOT NULL DEFAULT 'draft';

-- SQL function whose body contains a SELECT — must NOT be stripped.
CREATE FUNCTION public.get_user_post_count(user_id bigint)
RETURNS integer
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT count(*)::integer
  FROM public.posts
  WHERE public.posts.user_id = $1
$$;

-- plpgsql function (uses SELECT INTO and PERFORM).
CREATE FUNCTION public.publish_post(post_id bigint)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_current public.post_status;
BEGIN
  SELECT status INTO v_current
  FROM public.posts
  WHERE id = post_id
  FOR UPDATE;

  IF v_current = 'published' THEN
    RETURN true;
  END IF;

  UPDATE public.posts
  SET status = 'published', published_at = now()
  WHERE id = post_id;

  PERFORM pg_notify('post_published', post_id::text);
  RETURN true;
END;
$$;

-- View wrapping a join.
CREATE OR REPLACE VIEW public.published_posts AS
SELECT
  p.id,
  p.title,
  p.body,
  p.published_at,
  u.display_name AS author
FROM public.posts p
JOIN public.users u ON u.id = p.user_id
WHERE p.status = 'published';

-- Top-level ad-hoc audit SELECT — MUST be stripped (not a function body).
SELECT now() AS cutover_time;

-- Trailing DML trick: a row that "publishes" all existing posts.
UPDATE public.posts SET status = 'published' WHERE status = 'draft';
