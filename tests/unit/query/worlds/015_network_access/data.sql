INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (1, '10.1.2.3', '10/8', '10.0.0.0', '10.255.255.255', '10.1.2.3', '10.1.2.3', true);
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (1, '10.1/16', '10/8', '192.168/16');
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (1, '10.0.0.1', '10/8', '10.0.0.1', '10/8', false);
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (1, '10.0.0.255', 1, '10.0.1.0', '10.0.0.254', 1);
