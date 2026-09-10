-- The verified state selects the CHECK arm that supplies collection, result,
-- review, and verification evidence. The generated display then has a result.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  s.id,             -- @notNull
  s.collected_at,   -- @notNull
  s.result_value,   -- @notNull
  s.verified_at,    -- @notNull
  s.reviewer,       -- @notNull
  s.result_display  -- @notNull
FROM lab_samples s
WHERE s.state = 'verified'
