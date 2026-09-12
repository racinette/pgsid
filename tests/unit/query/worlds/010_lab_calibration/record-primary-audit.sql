-- @search-path cal_primary, cal_secondary, lab
-- @args [5001, 1, 2.0, "primary analyst"]
-- @args [5001, 2, null, "primary analyst"]
-- @args [5003, 3, null, "primary analyst"]
-- @param 1 notNull
-- @param 2 nullable
-- @param 3 nullable
-- @param 4 notNull
-- @null-groups none
-- @param-rejections none
INSERT INTO public.review_audits
  (audit_id, run_id, observation_id, reviewer_label, normalized_value,
   control_value, review_state, reviewed_at, review_note)
SELECT
  $1, o.run_id, o.observation_id, $4,
  $3::lab.reading + o.reference_reading,
  @@ o.raw_reading,
  'pending', '2026-09-04 08:00+00', o.observation_note
FROM public.observations AS o
WHERE o.observation_id = $2
RETURNING WITH (OLD AS absent, NEW AS recorded)
  absent.audit_id,          -- @alwaysNull
  absent.reviewer_label,    -- @alwaysNull
  recorded.audit_id,        -- @notNull
  recorded.normalized_value,-- @notNull
  recorded.control_value,   -- @notNull
  recorded.review_note,     -- @nullable
  recorded.review_marker    -- @nullable
