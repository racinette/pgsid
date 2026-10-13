-- name: reservation_uses_largest_requirement
INSERT INTO replicated_resource_limits (id, replica_slots, requested_slots, failover_slots, capacity_limit, review_waived) VALUES (100, 2, 3, 4, 4, false);
-- name: reservation_rejects_request_above_capacity
INSERT INTO replicated_resource_limits (id, replica_slots, requested_slots, failover_slots, capacity_limit, review_waived) VALUES (100, 2, 7, 4, 5, false);
-- name: reservation_rejects_failover_above_capacity
INSERT INTO replicated_resource_limits (id, replica_slots, requested_slots, failover_slots, capacity_limit, review_waived) VALUES (100, 2, 3, 7, 5, false);
-- name: reservation_ignores_null_request
INSERT INTO replicated_resource_limits (id, replica_slots, requested_slots, failover_slots, capacity_limit, review_waived) VALUES (100, 2, NULL, 4, 4, false);
-- name: reservation_all_requirements_null
INSERT INTO replicated_resource_limits (id, replica_slots, requested_slots, failover_slots, capacity_limit, review_waived) VALUES (100, NULL, NULL, NULL, 0, false);
-- name: reservation_preserves_bigint_boundary
INSERT INTO replicated_resource_limits (id, replica_slots, requested_slots, failover_slots, capacity_limit, review_waived) VALUES (100, 2, 3, 9223372036854775807, 9223372036854775807, false);
-- name: reservation_reaches_smallint_overflow_before_widening
INSERT INTO replicated_resource_limits (id, replica_slots, requested_slots, failover_slots, capacity_limit, review_waived) VALUES (100, 32767, 3, 9223372036854775807, 9223372036854775807, false);
-- name: reservation_waiver_skips_smallint_overflow
INSERT INTO replicated_resource_limits (id, replica_slots, requested_slots, failover_slots, capacity_limit, review_waived) VALUES (100, 32767, 3, 4, 4, true);

-- name: negotiated_price_meets_floor
INSERT INTO contract_price_limits (id, listed_price, negotiated_price, minimum_price) VALUES (100, 10.00, 8.00, 8.0);
-- name: negotiated_price_below_floor
INSERT INTO contract_price_limits (id, listed_price, negotiated_price, minimum_price) VALUES (100, 10.00, 7.99, 8.00);
-- name: listed_price_below_floor
INSERT INTO contract_price_limits (id, listed_price, negotiated_price, minimum_price) VALUES (100, 7.99, 10.00, 8.00);
-- name: missing_negotiation_uses_listed_price
INSERT INTO contract_price_limits (id, listed_price, negotiated_price, minimum_price) VALUES (100, 8.00, NULL, 8.00);
-- name: missing_listing_uses_negotiated_price
INSERT INTO contract_price_limits (id, listed_price, negotiated_price, minimum_price) VALUES (100, NULL, 8.00, 8.00);
-- name: no_price_is_null
INSERT INTO contract_price_limits (id, listed_price, negotiated_price, minimum_price) VALUES (100, NULL, NULL, 8.00);
-- name: equal_prices_with_different_scales
INSERT INTO contract_price_limits (id, listed_price, negotiated_price, minimum_price) VALUES (100, 8.000, 8.0, 8.00);
-- name: nan_price_does_not_hide_finite_price
INSERT INTO contract_price_limits (id, listed_price, negotiated_price, minimum_price) VALUES (100, 'NaN', 7.99, 8.00);
-- name: infinite_prices_meet_finite_floor
INSERT INTO contract_price_limits (id, listed_price, negotiated_price, minimum_price) VALUES (100, 'Infinity', 'NaN', 8.00);

-- name: measured_latency_meets_limit
INSERT INTO latency_samples (id, declared_latency, total_latency, sample_count, maximum_latency, review_waived) VALUES (100, 3, 10, 2, 5, false);
-- name: declared_latency_exceeds_limit
INSERT INTO latency_samples (id, declared_latency, total_latency, sample_count, maximum_latency, review_waived) VALUES (100, 7, 10, 2, 5, false);
-- name: measured_latency_exceeds_limit
INSERT INTO latency_samples (id, declared_latency, total_latency, sample_count, maximum_latency, review_waived) VALUES (100, 3, 14, 2, 5, false);
-- name: measured_latency_with_null_declaration
INSERT INTO latency_samples (id, declared_latency, total_latency, sample_count, maximum_latency, review_waived) VALUES (100, NULL, 10, 2, 5, false);
-- name: null_measurement_uses_declaration
INSERT INTO latency_samples (id, declared_latency, total_latency, sample_count, maximum_latency, review_waived) VALUES (100, 3, NULL, 0, 5, false);
-- name: all_latency_inputs_null
INSERT INTO latency_samples (id, declared_latency, total_latency, sample_count, maximum_latency, review_waived) VALUES (100, NULL, NULL, NULL, 5, false);
-- name: declaration_does_not_skip_zero_divisor
INSERT INTO latency_samples (id, declared_latency, total_latency, sample_count, maximum_latency, review_waived) VALUES (100, 3, 10, 0, 5, false);
-- name: null_declaration_does_not_skip_zero_divisor
INSERT INTO latency_samples (id, declared_latency, total_latency, sample_count, maximum_latency, review_waived) VALUES (100, NULL, 10, 0, 5, false);
-- name: measured_latency_reaches_integer_overflow
INSERT INTO latency_samples (id, declared_latency, total_latency, sample_count, maximum_latency, review_waived) VALUES (100, 3, -2147483648, -1, 5, false);
-- name: latency_waiver_skips_zero_divisor
INSERT INTO latency_samples (id, declared_latency, total_latency, sample_count, maximum_latency, review_waived) VALUES (100, 3, 10, 0, 5, true);
-- name: latency_waiver_skips_integer_overflow
INSERT INTO latency_samples (id, declared_latency, total_latency, sample_count, maximum_latency, review_waived) VALUES (100, 3, -2147483648, -1, 5, true);
