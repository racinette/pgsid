CREATE DOMAIN public.user_id AS bigint;
CREATE TYPE public.state AS ENUM ('ready', 'done');
CREATE TYPE public.profile AS (id public.user_id, label text, payload jsonb);
CREATE TABLE public.items (
 id bigint PRIMARY KEY,
 user_id public.user_id,
 state public.state,
 payload jsonb,
 maybe_payload jsonb NOT NULL,
 numbers bigint[],
 metadata public.profile
);
