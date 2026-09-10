-- A patient can exist without a visit, and a visit can exist without a sample.
-- The sample's absence therefore depends on, but is not equivalent to, the
-- visit's absence.
-- @params none
-- @null-group 1*,2*
-- @null-group 3*,4*
-- @param-rejections none
SELECT
  p.id,          -- @notNull
  v.id,          -- @nullable
  v.clinician,   -- @nullable
  s.id,          -- @nullable
  s.test_name    -- @nullable
FROM patients p
LEFT JOIN visits v ON v.patient_id = p.id
LEFT JOIN lab_samples s ON s.visit_id = v.id
