-- The inner quality chain is optional as a whole for each device. A device
-- without a measured run therefore null-extends three required identities and
-- the result verdict in one outer presence unit.
-- @params none
-- @null-group 1*,2*,3*,4
-- @param-rejections none
SELECT
  d.serial_number, -- @notNull
  r.id,             -- @nullable
  i.id,             -- @nullable
  x.id,             -- @nullable
  x.verdict         -- @nullable
FROM devices d
LEFT JOIN (
  production_runs r
  JOIN inspections i ON i.run_id = r.id AND i.device_id = r.device_id
  JOIN inspection_results x ON x.inspection_id = i.id
) ON r.device_id = d.id
