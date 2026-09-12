-- @search-path cal_primary, cal_secondary, lab
-- @args [10.0, 1]
-- @args [null, 1]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  o.observation_id,     -- @notNull
  o.raw_reading,        -- @nullable
  o.observation_note    -- @nullable
FROM public.observations AS o
WHERE o.raw_reading ~== $1::numeric
  AND o.observation_id >= $2
