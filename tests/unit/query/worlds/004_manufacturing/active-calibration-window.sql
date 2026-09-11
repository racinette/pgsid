-- The active arm proves retirement absent, while the range predicates prove
-- that the otherwise optional calibration date is present.
-- @args ["2026-01-01", "2027-01-01"]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  d.serial_number,    -- @notNull
  d.calibration_due,  -- @notNull
  d.retired_on        -- @alwaysNull
FROM devices d
WHERE d.state = 'active'
  AND d.calibration_due >= $1
  AND d.calibration_due < $2
