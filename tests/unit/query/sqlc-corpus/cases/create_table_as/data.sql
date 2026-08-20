-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- `CREATE TABLE second_table AS SELECT * FROM foo` copied foo.val's name
-- and type and not its NOT NULL, so this INSERT is accepted.
INSERT INTO second_table (val) VALUES (NULL);
