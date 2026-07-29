-- JSONB operators and functions. JSONB access operators (->, ->>) are
-- A_Expr nodes → conservative nullable. jsonb_build_object never returns
-- NULL but is an unknown function → conservative nullable (precision gap,
-- acceptable). jsonb_agg is an aggregate → nullable. COALESCE recovers
-- non-null. jsonb_agg is now in AGGREGATE_NAMES for correct detection.
SELECT
  e.data->'id'                        AS json_access,    -- @nullable
  e.data->>'id'                       AS text_access,    -- @nullable
  COALESCE(e.meta, '{}'::jsonb)       AS safe_meta,     -- @notNull
  jsonb_build_object('k', e.data)     AS build_obj,     -- @nullable
  (SELECT jsonb_agg(e2.data) FROM events e2) AS json_agg,  -- @nullable
  COALESCE(e.data->>'missing', 'N/A') AS safe_access    -- @notNull
FROM events e
