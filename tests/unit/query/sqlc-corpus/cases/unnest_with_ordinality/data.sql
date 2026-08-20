-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- `values text[] NOT NULL` constrains the ARRAY, never its ELEMENTS, so
-- this array satisfies the column and still unnests to a NULL.
INSERT INTO array_values (values) VALUES (ARRAY['a', NULL]::text[]);
