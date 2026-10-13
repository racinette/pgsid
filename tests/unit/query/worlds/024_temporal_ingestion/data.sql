INSERT INTO calendar_imports (id, raw_day, expected_day, skip_import)
VALUES (1, '1970-01-01', '1970-01-01', false);

INSERT INTO local_clock_imports (id, calendar_id, raw_time, expected_time, skip_import)
VALUES (1, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00', false);

INSERT INTO instant_imports (id, calendar_id, raw_time, expected_time, skip_import)
VALUES (1, 1, '1970-01-01 00:00:00+00', '1970-01-01 00:00:00+00', false);
