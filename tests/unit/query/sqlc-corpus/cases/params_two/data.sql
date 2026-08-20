-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- All partial-NULL combinations, so each conjunct has a row it alone removes.
INSERT INTO foo (a, b) VALUES (NULL, NULL), ('x', NULL), ('x', 'y');
