-- JSONB operators and functions. The access operators (->, ->>) are strict
-- yet still return NULL for a missing key, so they are NOT total operators
-- and stay nullable even with two non-null operands — the exact reason
-- operator strictness cannot license non-null propagation. jsonb_build_object never returns
-- NULL — it builds a container even from NULL members — and is recognised as
-- a built-in, so it reads non-null. jsonb_agg is an aggregate → nullable.
-- COALESCE recovers non-null.
--
-- `json_agg` carries a WHERE that matches nothing, and that is the whole
-- point of it. It used to read `FROM events e2` with no filter, which made
-- the subquery empty EXACTLY when the outer query returned no rows — the
-- fixture obstructing its own witness, the same shape the scalar-subquery
-- cluster turned out to be. An aggregate over zero rows is NULL, and asking
-- for a row that cannot exist is how to see that on a statement that still
-- returns something.
SELECT
  e.data->'id'                        AS json_access,    -- @nullable
  e.data->>'id'                       AS text_access,    -- @nullable
  COALESCE(e.meta, '{}'::jsonb)       AS safe_meta,     -- @notNull
  jsonb_build_object('k', e.data)     AS build_obj,     -- @notNull
  (SELECT jsonb_agg(e2.data) FROM events e2
    WHERE e2.id = -1)                 AS json_agg,     -- @nullable
  COALESCE(e.data->>'missing', 'N/A') AS safe_access    -- @notNull
FROM events e
