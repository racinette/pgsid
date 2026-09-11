-- Grant-removal events always classify from their required actor; the audit
-- detail remains optional even when the generated classification is present.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  a.event_id,        -- @notNull
  a.actor_label,     -- @notNull
  a.classification,  -- @notNull
  a.detail,          -- @nullable
  a.previous_expiry  -- @alwaysNull
FROM audit_events AS a
WHERE a.event_kind = 'grant_removed'
