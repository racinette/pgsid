-- name: sensor_bounds_pass
INSERT INTO sensor_limits (id, minimum_reading, maximum_reading, nominal_reading) VALUES (2, 0, 100, 50);
-- name: sensor_bounds_reject
INSERT INTO sensor_limits (id, minimum_reading, maximum_reading, nominal_reading) VALUES (2, 10, 9, NULL);
-- name: sensor_nominal_reject
INSERT INTO sensor_limits (id, minimum_reading, maximum_reading, nominal_reading) VALUES (2, 0, 100, 101);
-- name: sensor_bounds_null
INSERT INTO sensor_limits (id, minimum_reading, maximum_reading, nominal_reading) VALUES (2, NULL, NULL, NULL);
-- name: sensor_nan_bounds_reject
INSERT INTO sensor_limits (id, minimum_reading, maximum_reading, nominal_reading) VALUES (2, 'NaN', 100, NULL);
-- name: sensor_sample_pass
INSERT INTO sensor_samples (id, sensor_id, reading, reference_reading, divisor, expected_ratio, skip_ratio) VALUES (2, 1, 6, 6, 2, 3, false);
-- name: sensor_sample_mismatch
INSERT INTO sensor_samples (id, sensor_id, reading, reference_reading, divisor, expected_ratio, skip_ratio) VALUES (2, 1, 6, 7, 2, 3, false);
-- name: sensor_sample_ratio_reject
INSERT INTO sensor_samples (id, sensor_id, reading, reference_reading, divisor, expected_ratio, skip_ratio) VALUES (2, 1, 6, 6, 2, 4, false);
-- name: sensor_sample_zero_divisor
INSERT INTO sensor_samples (id, sensor_id, reading, reference_reading, divisor, expected_ratio, skip_ratio) VALUES (2, 1, 1, 1, 0, 0, false);
-- name: sensor_sample_skip_division
INSERT INTO sensor_samples (id, sensor_id, reading, reference_reading, divisor, expected_ratio, skip_ratio) VALUES (2, 1, 1, 1, 0, 0, true);
-- name: sensor_sample_null_ratio
INSERT INTO sensor_samples (id, sensor_id, reading, reference_reading, divisor, expected_ratio, skip_ratio) VALUES (2, 1, NULL, NULL, NULL, NULL, false);
-- name: sensor_sample_signed_zero
INSERT INTO sensor_samples (id, sensor_id, reading, reference_reading, divisor, expected_ratio, skip_ratio) VALUES (2, 1, '-0', '0', 1, '-0', false);
-- name: sensor_sample_subnormal
INSERT INTO sensor_samples (id, sensor_id, reading, reference_reading, divisor, expected_ratio, skip_ratio) VALUES (2, 1, '1e-45', '1e-45'::real::double precision, 1, '1e-45', false);
-- name: sensor_sample_nan
INSERT INTO sensor_samples (id, sensor_id, reading, reference_reading, divisor, expected_ratio, skip_ratio) VALUES (2, 1, 'NaN', 'NaN', 0, 'NaN', false);
-- name: sensor_sample_infinity
INSERT INTO sensor_samples (id, sensor_id, reading, reference_reading, divisor, expected_ratio, skip_ratio) VALUES (2, 1, 'Infinity', 'Infinity', 2, 'Infinity', false);
-- name: reading_import_pass
INSERT INTO reading_imports (id, sensor_id, raw_reading, expected_reading, skip_import) VALUES (2, 1, '1.25', 1.25, false);
-- name: reading_import_reject
INSERT INTO reading_imports (id, sensor_id, raw_reading, expected_reading, skip_import) VALUES (2, 1, '1.25', 1.5, false);
-- name: reading_import_double_rounding
INSERT INTO reading_imports (id, sensor_id, raw_reading, expected_reading, skip_import) VALUES (2, 1, '1.000000059604644775390625000001', '1.00000011920928955078125', false);
-- name: reading_import_invalid
INSERT INTO reading_imports (id, sensor_id, raw_reading, expected_reading, skip_import) VALUES (2, 1, 'invalid', 0, false);
-- name: reading_import_range_error
INSERT INTO reading_imports (id, sensor_id, raw_reading, expected_reading, skip_import) VALUES (2, 1, '1e999', 0, false);
-- name: reading_import_skip_error
INSERT INTO reading_imports (id, sensor_id, raw_reading, expected_reading, skip_import) VALUES (2, 1, 'invalid', 0, true);
-- name: reading_import_null
INSERT INTO reading_imports (id, sensor_id, raw_reading, expected_reading, skip_import) VALUES (2, 1, NULL, NULL, false);

-- name: magnitude_square_root
INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (2,1,9,3,'\x4008000000000000',false);
-- name: magnitude_wrong_value
INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (2,1,9,4,'\x4008000000000000',false);
-- name: magnitude_wrong_wire
INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (2,1,9,3,'\x4010000000000000',false);
-- name: magnitude_negative_zero
INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (2,1,'-0','-0','\x8000000000000000',false);
-- name: magnitude_fractional_root
INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (2,1,0.25,0.5,'\x3fe0000000000000',false);
-- name: magnitude_infinite_root
INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (2,1,'Infinity','Infinity','\x7ff0000000000000',false);
-- name: magnitude_nan_root
INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (2,1,'NaN','NaN','\x7ff8000000000000',false);
-- name: magnitude_null_root
INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (2,1,NULL,NULL,NULL,false);
-- name: magnitude_wrong_null_root
INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (2,1,NULL,1,NULL,false);
-- name: magnitude_negative_argument
INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (2,1,-1,NULL,NULL,false);
-- name: magnitude_lazy_negative_argument
INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (2,1,-1,NULL,NULL,true);
