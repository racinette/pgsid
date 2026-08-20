-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- One matching row and one NULL eventdate. The window is one MINUTE: with
-- `$1` NULL the interval `CONCAT('1 ', NULL)::interval` degrades to one
-- SECOND, and a wider range would generate tens of thousands of rows to
-- witness what 61 do.
INSERT INTO alertreport (eventdate) VALUES ('2020-01-01'), (NULL);
