-- @null-groups none
-- @param-rejections none
-- RETURNING reads NEW while WHERE tested OLD, but `active` is not a SET
-- column, so its TRUE fact transfers unchanged between the two stored rows.
-- The CASE therefore always takes its non-null first arm. The neighbouring
-- dml-returning-case-guard-old-row.sql updates active itself and is the NULL
-- witness that keeps the SET-column mask load-bearing.
UPDATE t
SET val = 'changed'
WHERE active
RETURNING
  CASE WHEN active THEN 'ok' ELSE name END AS guarded -- @notNull
