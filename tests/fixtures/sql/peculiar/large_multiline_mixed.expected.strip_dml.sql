-- Stress test: large multi-line DDL mixed with DML, with a view whose
-- body contains a deeply nested correlated subquery (to verify that
-- statement boundaries are computed correctly even when the parser is
-- stressed with a complex statement).

CREATE TABLE public.events (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id bigint NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_payload_check CHECK (jsonb_typeof(payload) IN ('object', 'array'))
);

CREATE INDEX events_user_id_idx ON public.events (user_id, occurred_at DESC);
CREATE INDEX events_type_idx ON public.events (event_type) WHERE event_type IN ('login', 'logout');
CREATE INDEX events_payload_gin ON public.events USING gin (payload jsonb_path_ops);

CREATE TABLE public.event_summaries (
  user_id bigint PRIMARY KEY,
  total_events integer NOT NULL DEFAULT 0,
  last_event_at timestamptz,
  most_common_type text
);

-- Backfill the summaries from a large aggregate query.
-- View that joins summaries back to users, with a CTE and window function.
CREATE OR REPLACE VIEW public.user_event_stats AS
WITH ranked AS (
  SELECT
    u.id AS user_id,
    u.display_name,
    u.email,
    s.total_events,
    s.last_event_at,
    s.most_common_type,
    rank() OVER (ORDER BY s.total_events DESC) AS activity_rank
  FROM public.users u
  LEFT JOIN public.event_summaries s ON s.user_id = u.id
)
SELECT
  user_id,
  display_name,
  email,
  total_events,
  last_event_at,
  most_common_type,
  activity_rank
FROM ranked
WHERE activity_rank <= 100;

-- Late audit DDL after a lot of DML.
CREATE TABLE public.audit_log (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One last trailing DML.
