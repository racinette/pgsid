CREATE TYPE public.event_state AS ENUM ('ready', 'in-progress', 'done');
ALTER TYPE public.event_state RENAME TO event_state_tmp;
CREATE DOMAIN public._event_state AS text;
ALTER TYPE public.event_state_tmp RENAME TO event_state;
DROP DOMAIN public._event_state;
CREATE DOMAIN public.event_id AS bigint NOT NULL CHECK (VALUE > 0);
CREATE DOMAIN public.default_event_id AS public.event_id DEFAULT 1;
CREATE TYPE public.event_metadata AS (
  source text,
  confidence numeric
);

CREATE TABLE public.accounts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  display_name text NOT NULL
);

CREATE TABLE public.events (
  id public.event_id PRIMARY KEY,
  default_id public.default_event_id,
  account_id bigint REFERENCES public.accounts(id),
  state public.event_state NOT NULL DEFAULT 'ready',
  states public.event_state[],
  payload jsonb NOT NULL,
  audit jsonb,
  metadata public.event_metadata,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE VIEW public.event_details AS
SELECT
  e.id,
  e.payload -> 'actor' AS actor,
  a.id AS account_id,
  a.display_name
FROM public.events AS e
LEFT JOIN public.accounts AS a ON a.id = e.account_id;

CREATE MATERIALIZED VIEW public.event_totals AS
SELECT state, count(*) AS total
FROM public.events
GROUP BY state;

CREATE SCHEMA billing;
CREATE DOMAIN billing.event_id AS bigint;
CREATE TYPE billing.event_state AS ENUM ('pending', 'paid');
CREATE TYPE billing.event_metadata AS (event public.event_id);
CREATE TABLE billing.events (
  id billing.event_id PRIMARY KEY,
  source_id public.event_id NOT NULL,
  state billing.event_state NOT NULL,
  metadata billing.event_metadata
);

CREATE SCHEMA "billing.extra";
CREATE DOMAIN "billing.extra".event_id AS bigint;
CREATE TABLE "billing.extra".events (id "billing.extra".event_id PRIMARY KEY);

CREATE SCHEMA billing_extra;
CREATE DOMAIN billing_extra.event_id AS bigint;
CREATE TABLE billing_extra.events (id billing_extra.event_id PRIMARY KEY);
