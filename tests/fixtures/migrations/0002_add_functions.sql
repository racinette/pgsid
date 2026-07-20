-- Migration: 0002_add_functions
-- Adds PL/pgSQL and SQL functions on top of the 0001 schema.
-- Demonstrates: plpgsql_check (PL/pgSQL) and PG native validation (SQL).

-- PL/pgSQL function: publish a post (uses SELECT INTO, UPDATE, PERFORM).
CREATE FUNCTION public.publish_post(post_id bigint)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT published_at INTO v_status
  FROM public.posts
  WHERE id = post_id
  FOR UPDATE;

  IF v_status IS NOT NULL THEN
    RETURN true;
  END IF;

  UPDATE public.posts
  SET published_at = now()
  WHERE id = post_id;

  PERFORM pg_notify('post_published', post_id::text);
  RETURN true;
END;
$$;

-- SQL function: get a user's email by ID.
CREATE FUNCTION public.get_user_email(uid bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT email FROM public.users WHERE id = $1;
$$;

-- PL/pgSQL function with a loop and conditional logic.
CREATE FUNCTION public.count_user_posts(uid bigint)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)::integer INTO v_count
  FROM public.posts
  WHERE user_id = uid;

  RETURN v_count;
END;
$$;
