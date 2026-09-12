-- @search-path cal_primary, cal_secondary, lab
-- @params none
-- @null-group 5*,6
-- @param-rejections none
SELECT
  o.observation_id,                     -- @notNull
  !! o.raw_reading AS strict_reading,   -- @nullable
  @@ o.raw_reading AS lenient_reading,  -- @notNull
  o.normalized_preview,                 -- @nullable
  i.service_state,                      -- @nullable
  a.audit_id,                           -- @nullable
  a.review_marker                       -- @nullable
FROM public.observations AS o
JOIN public.calibration_runs AS r ON r.run_id = o.run_id
JOIN public.instruments AS i ON i.instrument_id = r.instrument_id
LEFT JOIN public.review_audits AS a ON a.observation_id = o.observation_id
ORDER BY o.observation_id
