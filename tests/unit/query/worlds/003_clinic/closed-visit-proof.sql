-- The closed state selects the CHECK arm that supplies both timestamps; the
-- generated summary stays optional because neither summary part is required.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  v.id,           -- @notNull
  v.arrived_at,   -- @notNull
  v.closed_at,    -- @notNull
  v.summary_text  -- @nullable
FROM visits v
WHERE v.state = 'closed'
