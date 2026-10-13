INSERT INTO sensor_limits (id, minimum_reading, maximum_reading, nominal_reading) VALUES (1, 0, 100, 20);
INSERT INTO sensor_samples (id, sensor_id, reading, reference_reading, divisor, expected_ratio, skip_ratio) VALUES (1, 1, 4, 4, 2, 2, false);
INSERT INTO reading_imports (id, sensor_id, raw_reading, expected_reading, skip_import) VALUES (1, 1, '1.25', 1.25, false);

INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (1,1,9,3,'\x4008000000000000',false);
