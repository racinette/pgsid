-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- NULLIF's own meaning, reached with no NULL anywhere in the state: `id` is
-- `bigserial NOT NULL` and the binding below equals one of its values.
INSERT INTO author (id) VALUES (1), (2);
