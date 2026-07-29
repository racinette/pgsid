-- JSONB operators and functions. JSONB access operators (->, ->>) are
-- A_Expr nodes → conservative nullable. jsonb_build_object never returns
-- NULL but is an unknown function → conservative nullable (precision gap,
-- acceptable). jsonb_agg is an aggregate → nullable. COALESCE recovers
-- non-null. jsonb_agg is now in AGGREGATE_NAMES for correct detection.
SELECT
  e.data->'id'                        AS json_access,    -- 
  e.data->>'id'                       AS text_access,    -- 
  COALESCE(e.meta, '{}'::jsonb)       AS safe_meta,     -- 
  jsonb_build_object('k', e.data)     AS build_obj,     -- 
  (SELECT jsonb_agg(e2.data) FROM events e2) AS json_agg,  -- 
  COALESCE(e.data->>'missing', 'N/A') AS safe_access    -- 
FROM events e
