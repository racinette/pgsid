-- On the closed arm, the state CHECK makes closed_at present. Every other arm
-- uses the required scheduled time, so the CASE result is universally non-null.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  v.id, -- @notNull
  CASE
    WHEN v.state = 'closed' THEN v.closed_at
    ELSE v.scheduled_at
  END   -- @notNull
FROM visits v
