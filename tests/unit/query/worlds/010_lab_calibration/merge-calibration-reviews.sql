-- @search-path cal_primary, cal_secondary, lab
-- @args [900, "merged review", "review bot"]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 notNull
-- @null-group 1*,2*
-- @param-rejections none
MERGE INTO public.review_audits AS a
USING public.calibration_requests AS r
ON a.observation_id = r.observation_id
WHEN MATCHED AND r.request_id >= $1 THEN
  UPDATE SET control_value = @@ r.requested_reading,
             review_note = $2,
             review_state = 'accepted'
WHEN NOT MATCHED BY TARGET AND r.request_id >= $1 THEN
  INSERT
    (audit_id, run_id, observation_id, reviewer_label, normalized_value,
     control_value, review_state, reviewed_at, review_note)
  VALUES
    (6000 + r.request_id, r.run_id, r.observation_id, $3,
     r.normalized_value, @@ r.requested_reading, 'pending',
     '2026-09-05 08:00+00', r.request_note)
RETURNING WITH (OLD AS before, NEW AS after)
  merge_action(),        -- @notNull
  before.audit_id,       -- @nullable
  before.reviewer_label, -- @nullable
  after.audit_id,        -- @notNull
  after.control_value,   -- @notNull
  after.review_note,     -- @nullable
  after.review_marker,   -- @nullable
  r.request_id,          -- @notNull
  r.request_marker       -- @nullable
