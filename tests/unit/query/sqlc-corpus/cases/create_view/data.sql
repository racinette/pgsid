-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- `foo.val2` is a nullable column added by ALTER, and the row holding NULL
-- is present — it is the equality in the WHERE that removes it.
INSERT INTO foo (val, val2) VALUES ('x', NULL), ('y', 1);
