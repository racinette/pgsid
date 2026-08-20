-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- A NULL-named user present to be deleted, which the equality never matches.
INSERT INTO users (name) VALUES (NULL), ('bob');
