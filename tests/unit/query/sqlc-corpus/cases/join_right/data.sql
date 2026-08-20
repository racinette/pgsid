-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- `bar` id 2 has no partner, which is the row a RIGHT JOIN null-extends;
-- `foo` id 10 holds a NULL `bar_id`.
INSERT INTO bar (id) VALUES (1), (2);
INSERT INTO foo (id, bar_id) VALUES (10, NULL), (11, 1);
