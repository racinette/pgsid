INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (1, '10.1.2.3', '10/8', '10.0.0.0', '10.255.255.255', '10.1.2.3', '10.1.2.3', true);
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (1, '10.1/16', '10/8', '192.168/16');
