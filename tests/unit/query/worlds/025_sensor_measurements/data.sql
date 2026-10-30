INSERT INTO sensor_limits (id, minimum_reading, maximum_reading, nominal_reading) VALUES (1, 0, 100, 20);
INSERT INTO sensor_samples (id, sensor_id, reading, reference_reading, divisor, expected_ratio, skip_ratio) VALUES (1, 1, 4, 4, 2, 2, false);
INSERT INTO reading_imports (id, sensor_id, raw_reading, expected_reading, skip_import) VALUES (1, 1, '1.25', 1.25, false);

INSERT INTO calibrated_magnitudes (id,sensor_id,squared_value,recorded_magnitude,recorded_wire,skip_validation)
VALUES (1,1,9,3,'\x4008000000000000',false);

INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(1,1,'stored_hash','1'::real,'1'::real::float8,0,376496956,4033440226552636220,376496956,4033440226552636220,false);

INSERT INTO signal_transforms (id,sensor_id,phase,recorded_sine,recorded_growth,recorded_spread,skip_transform)
VALUES (1,1,0.5,'\x3fdeaee8744b05f0','\x40006ef944a6f658','\x3fbea7ea5a2ab17f',false);

INSERT INTO signal_buckets (id,sensor_id,phase,low_bound,high_bound,recorded_bucket,recorded_shape,skip_bucket)
VALUES (1,1,0.5,-10,10,3,'\x40302ef9af415878',false);
