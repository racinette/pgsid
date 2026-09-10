-- Aggregate expressions deliberately do not join an output presence group:
-- COUNT manufactures a value while MAX remains nullable for a patient without
-- a visit.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  p.id,                 -- @notNull
  count(v.id),          -- @notNull
  max(v.closed_at)      -- @nullable
FROM patients p
LEFT JOIN visits v ON v.patient_id = p.id
GROUP BY p.id
