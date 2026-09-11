-- The captured arm supplies settlement time and amount, which make both
-- generated settlement values present. A provider note remains optional.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  c.id,                 -- @notNull
  c.settled_at,         -- @notNull
  c.settled_amount,     -- @notNull
  c.net_amount,         -- @notNull
  c.settlement_marker,  -- @notNull
  c.provider_note       -- @nullable
FROM charges c
WHERE c.state = 'captured'
