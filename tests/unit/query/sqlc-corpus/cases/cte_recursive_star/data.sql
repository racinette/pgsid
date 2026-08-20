-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- Both arms of the recursion reached, the nullable columns NULL where the
-- schema allows, and no row with `code = ''` so the anchor's scalar subquery
-- is NULL and the COALESCE default is the one that lands in the path array.
INSERT INTO dict (id, app_id, code, parent_code, value, is_delete) VALUES ('r1', '1', 'root', '', NULL, false);
INSERT INTO dict (id, app_id, code, parent_code, value, is_delete) VALUES ('c1', '1', 'child', 'root', NULL, false);
INSERT INTO dict (id, app_id, code, parent_code, value, is_delete) VALUES ('e1', '1', NULL, 'root', NULL, false);
