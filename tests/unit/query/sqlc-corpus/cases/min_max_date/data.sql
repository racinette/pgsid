-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- A row the predicate does not select. An ungrouped aggregate still emits
-- its one row, and that is the row that witnesses this.
INSERT INTO activities (account_id, event_time) VALUES (7, now());
