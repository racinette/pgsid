-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- A nullable enum column with a NULL row present.
INSERT INTO query_param_enum_table (id, other, value) VALUES (1, 'g', NULL), (2, 'g', 'h');
