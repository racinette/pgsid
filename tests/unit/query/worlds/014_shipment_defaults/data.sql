INSERT INTO replenishment_picks (id, small_units, warehouse_units, overflow_units, recorded_units, recorded_baseline, recorded_double, recorded_ratio) VALUES (1, 7, 3, 5, 7, 7, 14, 5);

INSERT INTO delivery_defaults (id, requested_day, backup_day, recorded_day, scheduled_at, backup_schedule, recorded_schedule, confirmed_at, backup_confirmation, recorded_confirmation, enabled, backup_enabled, recorded_enabled) VALUES (1, '2026-10-01', '2026-10-02', '2026-10-01', '2026-10-01 10:20:30', '2026-10-02 11:22:33', '2026-10-01 10:20:30', '2026-10-01 10:20:30+03', '2026-10-02 11:22:33-04', '2026-10-01 10:20:30+03', true, false, true);

INSERT INTO shipment_labels (id, short_label, backup_label, recorded_label, code, backup_code, recorded_code, fee, backup_fee, recorded_fee, stage, backup_stage, recorded_stage) VALUES (1, 'first', 'second', 'first', 'A', 'B', 'A', '1.2300', '4.5600', '1.2300', 'dispatched', 'held', 'dispatched');

INSERT INTO shipment_fee_sign (id, skip, amount, other_amount, comparison_record, larger_record, smaller_record, absolute_record, negated_record, original_record, sign_record)
VALUES (1, false, -12.3400, 8.5, -1, 8.5, -12.34, 12.34, 12.34, -12.34, -1);

INSERT INTO shipment_fee_scale (id, skip, amount, display_scale, minimum_scale, trimmed_record)
VALUES (1, false, -12.3400, 4, 2, -12.34);

INSERT INTO shipment_fee_whole (id, skip, amount, ceiling_record, floor_record)
VALUES (1, false, -12.34, -12, -13);

INSERT INTO shipment_fee_precision (id, skip, amount, places, rounded_record, whole_rounded_record, truncated_record, whole_truncated_record)
VALUES (1, false, -12.3450, 2, -12.35, -12, -12.34, -12);

INSERT INTO shipment_fee_small_units (id, suppress_invalid, amount, recorded_units, recorded_amount) VALUES (1, false, 1.5, 2, 2);

INSERT INTO shipment_fee_regular_units (id, suppress_invalid, amount, recorded_units, recorded_amount) VALUES (1, false, 1.5, 2, 2);

INSERT INTO shipment_fee_bulk_units (id, suppress_invalid, amount, recorded_units, recorded_amount) VALUES (1, false, 1.5, 2, 2);

INSERT INTO shipment_fee_totals (id, skip, amount, adjustment, sum_record, difference_record, product_record, next_record, sum_scale, product_scale, product_wire)
VALUES (1, false, '12.3400'::numeric, '0.660'::numeric, '13.0000'::numeric, '11.6800'::numeric, '8.1444000'::numeric, '13.3400'::numeric, '4'::integer, '7'::integer, '\x0002000000000007000805a4'::bytea);

INSERT INTO shipment_fee_fingerprints (id, skip, amount, seed, hash_record, seeded_hash_record)
VALUES (1, false, '12.3400'::numeric, '0'::bigint, '-462988411'::integer, '-857365310575518843'::bigint);

INSERT INTO shipment_fee_window (id, skip, amount, baseline, tolerance, subtract, less, range_record)
VALUES (1, false, '10'::numeric, '10'::numeric, '1'::numeric, false, true, true);

INSERT INTO shipment_fee_bounds (id, skip, amount, modifier, rounded_record, scale_record, wire_record)
VALUES (1, false, '12.345'::numeric, 327686, '12.35'::numeric, '2'::integer, '\x0002000000000002000c0dac'::bytea);

INSERT INTO shipment_fee_quotients (id, skip, amount, divisor, quotient_record, whole_record, remainder_record, quotient_scale, remainder_scale, quotient_wire)
VALUES (1, false, '12.3400'::numeric, '0.660'::numeric, '18.6969696969696970'::numeric, '18'::numeric, '0.4600'::numeric, '16'::integer, '4'::integer, '\x000500000000001000121b391b391b391b3a'::bytea);

INSERT INTO shipment_fee_common_units (id, skip, amount, baseline, common_record, multiple_record, common_scale, multiple_wire)
VALUES (1, false, '12.3400'::numeric, '0.660'::numeric, '0.0200'::numeric, '407.2200'::numeric, '4'::integer, '\x000200000000000401970898'::bytea);

INSERT INTO shipment_storage_sizes (id, skip, bytes, size_record, octets_record)
VALUES (1, false, '12.3400'::numeric, '12.3400 bytes'::text, '13'::integer);
