-- @args [1, 109, null, null, "system closer", "fallback closer"]
-- @args [1, 109, "manual resolution", "fallback resolution", "system closer", "fallback closer"]
-- @args [1, 999, null, null, null, null]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
-- @param 4 nullable
-- @param 5 nullable
-- @param 6 nullable
-- @null-groups none
-- @param-reject 5,6
WITH moved
  (claim_id, before_jurisdiction, before_stage, before_resolution,
   after_jurisdiction, after_stage, after_resolution, after_marker) AS (
  UPDATE routed_claims AS c
  SET jurisdiction = 'EU',
      stage = 'closed',
      closed_at = '2026-09-08 10:00+00',
      resolution_note = coalesce($3::text, $4::text),
      review_note = 'event review'
  WHERE c.tenant_id = $1
    AND c.claim_id = $2
    AND c.jurisdiction = 'NA'
    AND c.stage = 'active'
  RETURNING WITH (OLD AS before, NEW AS after)
    before.claim_id,
    before.jurisdiction,
    before.stage,
    before.resolution_note,
    after.jurisdiction,
    after.stage,
    after.resolution_note,
    after.settlement_marker
)
INSERT INTO claim_events
  (tenant_id, event_id, claim_id, from_jurisdiction, from_stage,
   to_jurisdiction, to_stage, occurred_at, actor_label,
   previous_resolution, current_resolution)
SELECT
  $1, 900 + m.claim_id, m.claim_id, m.before_jurisdiction, m.before_stage,
  m.after_jurisdiction, m.after_stage, '2026-09-08 10:05+00',
  coalesce($5::text, $6::text), m.before_resolution, m.after_resolution
FROM moved AS m
RETURNING WITH (OLD AS absent, NEW AS recorded)
  absent.event_id,                -- @alwaysNull
  recorded.event_id,              -- @notNull
  recorded.claim_id,              -- @notNull
  recorded.actor_label,           -- @notNull
  recorded.previous_resolution,   -- @alwaysNull
  recorded.transition_marker      -- @nullable
