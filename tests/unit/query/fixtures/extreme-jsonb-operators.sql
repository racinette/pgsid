-- @unwitnessable 4: the jsonb_agg subquery aggregates the same table the outer query scans: it is empty exactly when the fixture returns no rows
-- JSONB operators and functions. The access operators (->, ->>) are strict
-- yet still return NULL for a missing key, so they are NOT total operators
-- and stay nullable even with two non-null operands — the exact reason
-- operator strictness cannot license non-null propagation. jsonb_build_object never returns
-- NULL — it builds a container even from NULL members — and is recognised as
-- a built-in, so it reads non-null. jsonb_agg is an aggregate → nullable.
-- COALESCE recovers non-null.
SELECT
  e.data->'id'                        AS json_access,    -- @nullable
  e.data->>'id'                       AS text_access,    -- @nullable
  COALESCE(e.meta, '{}'::jsonb)       AS safe_meta,     -- @notNull
  jsonb_build_object('k', e.data)     AS build_obj,     -- @notNull
  (SELECT jsonb_agg(e2.data) FROM events e2) AS json_agg,  -- @nullable
  COALESCE(e.data->>'missing', 'N/A') AS safe_access    -- @notNull
FROM events e
