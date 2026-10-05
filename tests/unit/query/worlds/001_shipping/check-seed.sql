-- name: delivered_without_dispatch
INSERT INTO shipments (id, carrier_id, declared_kg, status, shipped_at, delivered_at)
VALUES (100, 1, 20, 'in_transit', NULL, '2026-01-02 12:00+00');
-- name: delivery_after_dispatch
INSERT INTO shipments (id, carrier_id, declared_kg, status, shipped_at, delivered_at)
VALUES (100, 1, 20, 'in_transit', '2026-01-01 12:00+00', '2026-01-02 12:00+00');
-- name: shipment_not_yet_dispatched
INSERT INTO shipments (id, carrier_id, declared_kg, status, shipped_at, delivered_at)
VALUES (100, 1, 20, 'pending', NULL, NULL);

-- name: carrier_without_weight_bounds
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Check Freight', NULL, NULL);
-- name: carrier_with_only_lower_bound
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Check Freight', 10, NULL);
-- name: carrier_with_reversed_weight_bounds
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Check Freight', 100, 10);
-- name: carrier_with_empty_name
INSERT INTO carriers (id, name) VALUES (10000, '');
-- name: leg_without_destination
INSERT INTO shipment_legs (id, shipment_id, seq, origin, destination, distance_km, surcharge) VALUES (10000, 1, 100, 'Trondheim', NULL, 20, 1);
-- name: leg_without_optional_distance
INSERT INTO shipment_legs (id, shipment_id, seq, origin, destination, distance_km, surcharge) VALUES (10000, 1, 100, 'Trondheim', NULL, NULL, NULL);
-- name: leg_with_identical_endpoints
INSERT INTO shipment_legs (id, shipment_id, seq, origin, destination, distance_km, surcharge) VALUES (10000, 1, 100, 'Trondheim', 'Trondheim', 20, 1);
-- name: leg_with_zero_distance
INSERT INTO shipment_legs (id, shipment_id, seq, origin, destination, distance_km, surcharge) VALUES (10000, 1, 100, 'Trondheim', NULL, 0, 1);
-- name: delivered_shipment_without_delivery_date
INSERT INTO shipments (id, carrier_id, declared_kg, status, shipped_at, delivered_at) VALUES (10000, 1, 20, 'delivered', '2026-01-01 12:00+00', NULL);
-- name: shipment_billed_below_declared_weight
INSERT INTO shipments (id, carrier_id, declared_kg, billed_kg, status) VALUES (10000, 1, 20, 19, 'draft');

-- name: carrier_equal_bounds_with_different_scales
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Decimal Freight', 1.2300, 1.23);
-- name: carrier_adjacent_large_bounds
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Decimal Freight', 9007199254740992, 9007199254740993);
-- name: carrier_reversed_adjacent_large_bounds
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Decimal Freight', 9007199254740993, 9007199254740992);
-- name: carrier_tiny_fractional_bounds
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Decimal Freight', 0.00000000000000000000001, 0.00000000000000000000002);
-- name: carrier_reversed_tiny_fractional_bounds
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Decimal Freight', 0.00000000000000000000002, 0.00000000000000000000001);
-- name: carrier_negative_bounds
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Decimal Freight', -100.01, -100.00);
-- name: carrier_reversed_negative_bounds
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Decimal Freight', -100.00, -100.01);
-- name: carrier_infinite_bounds
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Decimal Freight', '-Infinity'::numeric, 'Infinity'::numeric);
-- name: carrier_nan_upper_bound
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Decimal Freight', 'Infinity'::numeric, 'NaN'::numeric);
-- name: carrier_nan_lower_bound
INSERT INTO carriers (id, name, min_weight_kg, max_weight_kg) VALUES (10000, 'Decimal Freight', 'NaN'::numeric, 'Infinity'::numeric);
-- name: shipment_equal_decimal_weights
INSERT INTO shipments (id, carrier_id, declared_kg, billed_kg, status) VALUES (10000, 1, 9223372036854775808.0001, 9223372036854775808.00010, 'draft');
-- name: shipment_billed_fraction_below_declared
INSERT INTO shipments (id, carrier_id, declared_kg, billed_kg, status) VALUES (10000, 1, 9223372036854775808.0001, 9223372036854775808.0000, 'draft');
