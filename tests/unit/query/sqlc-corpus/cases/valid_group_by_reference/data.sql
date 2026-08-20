-- Data state for the sqlc disagreement register. OURS, not vendored:
-- applied after schema.sql, inside the case's transaction. Why this state
-- is the one that decides the case is recorded in adjudication.json.

-- A group inside the six-month window whose every `temp_c` is NULL. AVG
-- skips NULL inputs, so the group is non-empty and the aggregate is still NULL.
INSERT INTO weather_metrics (time, city_name, temp_c) VALUES (now(), 'oslo', NULL);
