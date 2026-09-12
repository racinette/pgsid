-- @search-path cal_primary, cal_secondary, lab
-- @args [5000, 2.0, "adjusted from request", 900]
-- @args [5000, 2.0, null, 901]
-- @param 1 nullable
-- @param 2 notNull
-- @param 3 nullable
-- @param 4 nullable
-- @null-groups none
-- @param-rejections none
UPDATE public.review_audits AS a
SET normalized_value = r.normalized_value + $2,
    review_note = $3,
    review_state = 'accepted'
FROM public.calibration_requests AS r
WHERE a.audit_id = $1
  AND r.request_id = $4
  AND a.run_id = r.run_id
RETURNING WITH (OLD AS before, NEW AS after)
  before.audit_id,          -- @notNull
  before.normalized_value,  -- @notNull
  after.audit_id,           -- @notNull
  after.normalized_value,   -- @notNull
  after.review_note,        -- @nullable
  after.review_marker,      -- @nullable
  r.request_id,             -- @notNull
  r.request_marker          -- @nullable
