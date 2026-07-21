-- Migration: 0006_add_procedures
-- Adds stored procedures on top of the 0001/0003 schema.
-- Exercises:
--   1. A PL/pgSQL procedure (checked by plpgsql_check).
--   2. A procedure with an OUT argument (regprocedure must omit OUT-only
--      args, or plpgsql_check_function_tb fails the cast).
--   3. A LANGUAGE sql procedure (validated natively by PG).

-- PL/pgSQL procedure: publish all draft posts for a user. Returns nothing.
CREATE PROCEDURE public.publish_user_posts(uid bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.posts
    WHERE user_id = uid AND published_at IS NULL
  LOOP
    UPDATE public.posts
    SET published_at = now()
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- PL/pgSQL procedure with an OUT argument: count a user's draft posts.
-- The OUT arg is NOT part of the regprocedure signature, so
-- plpgsql_check_function_tb must be called as
-- `public.count_user_drafts(bigint)`, not `(bigint, integer)`.
CREATE PROCEDURE public.count_user_drafts(IN uid bigint, OUT n integer)
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT count(*)::integer INTO n
  FROM public.posts
  WHERE user_id = uid AND published_at IS NULL;
END;
$$;

-- LANGUAGE sql procedure: insert a seed post for the system user.
CREATE PROCEDURE public.seed_system_post()
LANGUAGE sql
AS $$
  INSERT INTO public.posts (user_id, title, body)
  VALUES (0, 'Hello', 'Seed post');
$$;
