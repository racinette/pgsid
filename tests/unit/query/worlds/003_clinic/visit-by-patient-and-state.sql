-- Required foreign-key and enum columns are filtered together before the
-- optional generated summary is projected.
-- @args [1, "closed"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  v.id,            -- @notNull
  p.full_name,     -- @notNull
  v.summary_text   -- @nullable
FROM visits v
JOIN patients p ON p.id = v.patient_id
WHERE v.patient_id = $1
  AND v.state = $2
