-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- Every NULL combination present in a table whose both columns are nullable.
INSERT INTO foo (a, b) VALUES (NULL, NULL), (1, NULL), (NULL, 2), (1, 2);
