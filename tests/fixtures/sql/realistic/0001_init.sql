-- Migration: 0001_init
-- A typical initial schema: users, posts, with FK and indexes.

CREATE TABLE public.users (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_check CHECK (email ~ '@')
);

CREATE UNIQUE INDEX users_email_uniq ON public.users (lower(email));

CREATE TABLE public.posts (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id bigint NOT NULL,
  title text NOT NULL,
  body text,
  tags text[] DEFAULT '{}',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_user_id_fk FOREIGN KEY (user_id)
    REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX posts_user_id_idx ON public.posts (user_id);
CREATE INDEX posts_published_idx ON public.posts (published_at DESC)
  WHERE published_at IS NOT NULL;

-- Defaults for convenience.
INSERT INTO public.users (id, email, display_name) VALUES
  (0, 'system@local', 'System User');
