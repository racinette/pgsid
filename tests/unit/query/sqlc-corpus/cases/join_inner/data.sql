-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- A NULL `events.ID` and a NULL `handled_events.last_handled_id`, so both
-- operands of the strict join qual get their turn.
INSERT INTO events (ID) VALUES (NULL), (5);
INSERT INTO handled_events (last_handled_id, handler) VALUES (1, 'h'), (NULL, 'h');
