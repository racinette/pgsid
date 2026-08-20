-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- Both columns are plain nullable `int`; `+` is strict, and the subquery
-- that renames the sum neither adds the guarantee nor removes it.
INSERT INTO foo (a, b) VALUES (1, NULL);
