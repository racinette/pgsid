-- One source row changes the clinician on an existing visit and the other
-- schedules a new visit, exercising both MERGE arms in one execution.
-- @args ["Dr Novak", "Dr Mensah"]
-- @param 1 notNull
-- @param 2 notNull
-- @null-groups none
-- @param-rejections none
MERGE INTO visits AS v
USING (VALUES
  (1, 1, $1::text, TIMESTAMPTZ '2025-01-08 09:00+00'),
  (10, 2, $2::text, TIMESTAMPTZ '2025-04-02 10:00+00')
) AS incoming (id, patient_id, clinician, scheduled_at)
ON v.id = incoming.id
WHEN MATCHED THEN
  UPDATE SET clinician = incoming.clinician
WHEN NOT MATCHED THEN
  INSERT (id, patient_id, clinician, scheduled_at, state)
  VALUES (incoming.id, incoming.patient_id, incoming.clinician,
          incoming.scheduled_at, 'scheduled')
RETURNING
  merge_action(),     -- @notNull
  v.id,               -- @notNull
  v.clinician,        -- @notNull
  incoming.id         -- @notNull
