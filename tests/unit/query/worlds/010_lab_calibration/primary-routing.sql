-- @search-path cal_primary, cal_secondary, lab
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  o.observation_id,                                      -- @notNull
  o.raw_reading + o.reference_reading AS routed_value,  -- @notNull
  o.raw_reading OPERATOR(cal_primary.+)
    o.reference_reading AS pinned_primary,               -- @notNull
  o.reference_reading::numeric + 1::numeric AS base_sum, -- @notNull
  'left'::text + 'right'::text AS label_route,            -- @notNull
  1 + 2 AS builtin_sum                                   -- @notNull
FROM public.observations AS o
ORDER BY o.observation_id
