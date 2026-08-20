-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- A group whose every `baz` is NULL, so `sum(baz)` is NULL and the
-- COALESCE default is the only thing left carrying the column.
INSERT INTO foo (bar, baz) VALUES ('a', NULL), ('a', NULL), (NULL, NULL), (NULL, 3);
