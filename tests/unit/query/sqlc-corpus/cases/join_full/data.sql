-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- A `foo` row matching no `bar` — the row a FULL JOIN null-extends on the
-- foo side, selected by id so the WHERE cannot be blamed for missing it.
INSERT INTO bar (id) VALUES (1);
INSERT INTO foo (id, bar_id) VALUES (10, NULL), (11, 1);
