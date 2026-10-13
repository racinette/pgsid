INSERT INTO replicated_resource_limits (id, replica_slots, requested_slots, failover_slots, capacity_limit, review_waived)
VALUES (1, 2, 3, 4, 5, false);

INSERT INTO contract_price_limits (id, listed_price, negotiated_price, minimum_price)
VALUES (1, 10.00, 9.50, 8.00);

INSERT INTO latency_samples (id, declared_latency, total_latency, sample_count, maximum_latency, review_waived)
VALUES (1, 3, 10, 2, 6, false);
