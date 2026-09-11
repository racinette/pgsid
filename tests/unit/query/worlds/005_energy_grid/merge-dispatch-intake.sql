-- One source row completes an existing dispatch and the other inserts a new
-- response, preserving both MERGE paths while DELETE and UPDATE enter this
-- world beside it.
-- @args ["load normalized", "South Desk"]
-- @param 1 nullable
-- @param 2 notNull
-- @null-groups none
-- @param-rejections none
MERGE INTO dispatch_actions AS d
USING (VALUES
  (2, 1, 'North Desk'::text, TIMESTAMPTZ '2026-08-01 10:04+00', $1::text),
  (10, 5, $2::text, TIMESTAMPTZ '2026-08-01 10:25+00', NULL::text)
) AS incoming (id, incident_id, operator_name, dispatched_at, outcome)
ON d.id = incoming.id
WHEN MATCHED THEN
  UPDATE SET completed_at = TIMESTAMPTZ '2026-08-01 10:30+00', outcome = incoming.outcome
WHEN NOT MATCHED THEN
  INSERT (id, incident_id, operator_name, dispatched_at)
  VALUES (incoming.id, incoming.incident_id, incoming.operator_name, incoming.dispatched_at)
RETURNING
  merge_action(),       -- @notNull
  d.id,                 -- @notNull
  d.operator_name,      -- @notNull
  d.outcome,            -- @nullable
  incoming.id           -- @notNull
