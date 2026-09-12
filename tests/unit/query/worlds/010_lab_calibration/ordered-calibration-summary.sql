-- @search-path cal_primary, cal_secondary, lab
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  l.laboratory_id,                                                   -- @notNull
  percentile_disc(0.5) WITHIN GROUP
    (ORDER BY !! o.raw_reading) AS median_normalized,                 -- @nullable
  rank(10::numeric) WITHIN GROUP
    (ORDER BY !! o.raw_reading) AS hypothetical_rank,                -- @notNull
  max(i.service_state) AS service_state,                             -- @nullable
  max(r.completion_label) AS completion_label,                       -- @nullable
  max(p.band_label) AS band_label,                                   -- @nullable
  count(o.observation_id) AS observation_count                       -- @notNull
FROM public.observations AS o
RIGHT JOIN public.calibration_runs AS r ON r.run_id = o.run_id
RIGHT JOIN public.instruments AS i ON i.instrument_id = r.instrument_id
RIGHT JOIN public.laboratories AS l ON l.laboratory_id = i.laboratory_id
LEFT JOIN public.calibration_policies AS p ON p.policy_id = r.policy_id
GROUP BY l.laboratory_id
ORDER BY l.laboratory_id
