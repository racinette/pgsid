-- Origin tracking through a view — the same mechanism as the CTE case and
-- the place users will actually feel it: filtering a projection view from
-- outside narrows exactly as filtering the base table would.
SELECT
  arrived_at,  -- @notNull
  room,        -- @notNull
  note         -- @nullable
FROM guest_directory
WHERE status = 'housed'
