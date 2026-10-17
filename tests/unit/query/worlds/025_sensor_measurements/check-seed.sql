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

-- name: hash_value_0
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_0','0'::real,'0'::real::float8,0,0,0,0,0,false);
-- name: hash_value_1
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_1','0'::real,'0'::real::float8,-1,0,-1,0,-1,false);
-- name: hash_value_2
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_2','0'::real,'0'::real::float8,-9223372036854775808,0,-9223372036854775808,0,-9223372036854775808,false);
-- name: hash_value_3
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_3','0'::real,'0'::real::float8,9223372036854775807,0,9223372036854775807,0,9223372036854775807,false);
-- name: hash_value_4
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_4','-0'::real,'-0'::real::float8,0,0,0,0,0,false);
-- name: hash_value_5
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_5','-0'::real,'-0'::real::float8,-1,0,-1,0,-1,false);
-- name: hash_value_6
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_6','-0'::real,'-0'::real::float8,-9223372036854775808,0,-9223372036854775808,0,-9223372036854775808,false);
-- name: hash_value_7
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_7','-0'::real,'-0'::real::float8,9223372036854775807,0,9223372036854775807,0,9223372036854775807,false);
-- name: hash_value_8
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_8','1.401298464324817e-45'::real,'1.401298464324817e-45'::real::float8,0,-1919087471,-9086320680330523503,-1919087471,-9086320680330523503,false);
-- name: hash_value_9
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_9','1.401298464324817e-45'::real,'1.401298464324817e-45'::real::float8,-1,-1919087471,3432837688180326606,-1919087471,3432837688180326606,false);
-- name: hash_value_10
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_10','1.401298464324817e-45'::real,'1.401298464324817e-45'::real::float8,-9223372036854775808,-1919087471,-4890914966879392469,-1919087471,-4890914966879392469,false);
-- name: hash_value_11
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_11','1.401298464324817e-45'::real,'1.401298464324817e-45'::real::float8,9223372036854775807,-1919087471,1202172356757142994,-1919087471,1202172356757142994,false);
-- name: hash_value_12
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_12','-1.401298464324817e-45'::real,'-1.401298464324817e-45'::real::float8,0,1249401031,-8270888653178775353,1249401031,-8270888653178775353,false);
-- name: hash_value_13
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_13','-1.401298464324817e-45'::real,'-1.401298464324817e-45'::real::float8,-1,1249401031,5672874310000299774,1249401031,5672874310000299774,false);
-- name: hash_value_14
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_14','-1.401298464324817e-45'::real,'-1.401298464324817e-45'::real::float8,-9223372036854775808,1249401031,-4669569282465223690,1249401031,-4669569282465223690,false);
-- name: hash_value_15
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_15','-1.401298464324817e-45'::real,'-1.401298464324817e-45'::real::float8,9223372036854775807,1249401031,4784820025541996672,1249401031,4784820025541996672,false);
-- name: hash_value_16
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_16','1.1754942106924411e-38'::real,'1.1754942106924411e-38'::real::float8,0,2073131713,-3395736772916708671,2073131713,-3395736772916708671,false);
-- name: hash_value_17
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_17','1.1754942106924411e-38'::real,'1.1754942106924411e-38'::real::float8,-1,2073131713,-7704915037802169522,2073131713,-7704915037802169522,false);
-- name: hash_value_18
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_18','1.1754942106924411e-38'::real,'1.1754942106924411e-38'::real::float8,-9223372036854775808,2073131713,3711129454486035846,2073131713,3711129454486035846,false);
-- name: hash_value_19
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_19','1.1754942106924411e-38'::real,'1.1754942106924411e-38'::real::float8,9223372036854775807,2073131713,6165277263829265456,2073131713,6165277263829265456,false);
-- name: hash_value_20
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_20','1.1754943508222875e-38'::real,'1.1754943508222875e-38'::real::float8,0,310671955,-4830045385260762541,310671955,-4830045385260762541,false);
-- name: hash_value_21
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_21','1.1754943508222875e-38'::real,'1.1754943508222875e-38'::real::float8,-1,310671955,6893068060586831074,310671955,6893068060586831074,false);
-- name: hash_value_22
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_22','1.1754943508222875e-38'::real,'1.1754943508222875e-38'::real::float8,-9223372036854775808,310671955,-3793591101649825684,310671955,-3793591101649825684,false);
-- name: hash_value_23
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_23','1.1754943508222875e-38'::real,'1.1754943508222875e-38'::real::float8,9223372036854775807,310671955,6465906491127299926,310671955,6465906491127299926,false);
-- name: hash_value_24
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_24','1'::real,'1'::real::float8,0,376496956,4033440226552636220,376496956,4033440226552636220,false);
-- name: hash_value_25
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_25','1'::real,'1'::real::float8,-1,376496956,2963906028543945686,376496956,2963906028543945686,false);
-- name: hash_value_26
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_26','1'::real,'1'::real::float8,-9223372036854775808,376496956,-10548282471671232,376496956,-10548282471671232,false);
-- name: hash_value_27
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_27','1'::real,'1'::real::float8,9223372036854775807,376496956,-4472240588788834889,376496956,-4472240588788834889,false);
-- name: hash_value_28
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_28','-1'::real,'-1'::real::float8,0,1360688392,7568378172490282248,1360688392,7568378172490282248,false);
-- name: hash_value_29
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_29','-1'::real,'-1'::real::float8,-1,1360688392,-8963245616636741022,1360688392,-8963245616636741022,false);
-- name: hash_value_30
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_30','-1'::real,'-1'::real::float8,-9223372036854775808,1360688392,-1001150537311989295,1360688392,-1001150537311989295,false);
-- name: hash_value_31
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_31','-1'::real,'-1'::real::float8,9223372036854775807,1360688392,-4126350996842029743,1360688392,-4126350996842029743,false);
-- name: hash_value_32
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_32','2.000000476837158'::real,'2.000000476837158'::real::float8,0,1537311883,4545352346022020235,1537311883,4545352346022020235,false);
-- name: hash_value_33
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_33','2.000000476837158'::real,'2.000000476837158'::real::float8,-1,1537311883,5806220086823172467,1537311883,5806220086823172467,false);
-- name: hash_value_34
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_34','2.000000476837158'::real,'2.000000476837158'::real::float8,-9223372036854775808,1537311883,-4815523649635241344,1537311883,-4815523649635241344,false);
-- name: hash_value_35
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_35','2.000000476837158'::real,'2.000000476837158'::real::float8,9223372036854775807,1537311883,7903119889078055209,1537311883,7903119889078055209,false);
-- name: hash_value_36
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_36','3.4028234663852886e+38'::real,'3.4028234663852886e+38'::real::float8,0,-1201430654,-8264235364741046398,-1201430654,-8264235364741046398,false);
-- name: hash_value_37
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_37','3.4028234663852886e+38'::real,'3.4028234663852886e+38'::real::float8,-1,-1201430654,-1144897042069400543,-1201430654,-1144897042069400543,false);
-- name: hash_value_38
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_38','3.4028234663852886e+38'::real,'3.4028234663852886e+38'::real::float8,-9223372036854775808,-1201430654,6990532984868445504,-1201430654,6990532984868445504,false);
-- name: hash_value_39
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_39','3.4028234663852886e+38'::real,'3.4028234663852886e+38'::real::float8,9223372036854775807,-1201430654,-3340882350073741972,-1201430654,-3340882350073741972,false);
-- name: hash_value_40
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_40','Infinity'::real,'Infinity'::real::float8,0,-2133226302,-4973912021728129854,-2133226302,-4973912021728129854,false);
-- name: hash_value_41
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_41','Infinity'::real,'Infinity'::real::float8,-1,-2133226302,7493403773338927829,-2133226302,7493403773338927829,false);
-- name: hash_value_42
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_42','Infinity'::real,'Infinity'::real::float8,-9223372036854775808,-2133226302,1762134298199272734,-2133226302,1762134298199272734,false);
-- name: hash_value_43
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_43','Infinity'::real,'Infinity'::real::float8,9223372036854775807,-2133226302,-9070790967368776104,-2133226302,-9070790967368776104,false);
-- name: hash_value_44
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_44','-Infinity'::real,'-Infinity'::real::float8,0,-1377680656,58695627279844080,-1377680656,58695627279844080,false);
-- name: hash_value_45
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_45','-Infinity'::real,'-Infinity'::real::float8,-1,-1377680656,-9044916755288003409,-1377680656,-9044916755288003409,false);
-- name: hash_value_46
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_46','-Infinity'::real,'-Infinity'::real::float8,-9223372036854775808,-1377680656,-8609171628834562316,-1377680656,-8609171628834562316,false);
-- name: hash_value_47
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_value_47','-Infinity'::real,'-Infinity'::real::float8,9223372036854775807,-1377680656,7034899048035810174,-1377680656,7034899048035810174,false);
-- name: hash_nan
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_nan','NaN'::real,'NaN'::real::float8,0,-1275764840,4719788943832604568,-1275764840,4719788943832604568,false);
-- name: hash_nan_skipped
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_nan_skipped','NaN'::real,'NaN'::real::float8,0,-1275764840,4719788943832604568,-1275764840,4719788943832604568,true);
-- name: hash_null
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_null',NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);
-- name: hash_null_seed
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_null_seed','1'::real,'1'::real::float8,NULL,376496956,NULL,376496956,NULL,false);
-- name: hash_reject_h32
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_reject_h32','1'::real,'1'::real::float8,-1,0,2963906028543945686,376496956,2963906028543945686,false);
-- name: hash_reject_h64
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_reject_h64','1'::real,'1'::real::float8,-1,376496956,0,376496956,2963906028543945686,false);
-- name: hash_reject_p32
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_reject_p32','1'::real,'1'::real::float8,-1,376496956,2963906028543945686,0,2963906028543945686,false);
-- name: hash_reject_p64
INSERT INTO hashed_readings(id,sensor_id,label,reading,precise_reading,seed,recorded_hash,recorded_seeded,recorded_precise_hash,recorded_precise_seeded,bypass) VALUES(2,1,'hash_reject_p64','1'::real,'1'::real::float8,-1,376496956,2963906028543945686,376496956,0,false);
