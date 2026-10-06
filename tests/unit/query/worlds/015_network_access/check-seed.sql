-- name: peer_ipv4_allowed
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, '10.1.2.3', '10/8', '10.0.0.0', '10.255.255.255', '10.1.2.3', '10.1.2.3', true);
-- name: peer_ipv6_allowed
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, '2001:db8::1', '2001:db8::/32', '2001:db8::', '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff', '2001:db8::1', '2001:db8::1', true);
-- name: peer_ipv4_outside_network
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, '11.1.2.3', '10/8', '11.0.0.0', '11.255.255.255', '11.1.2.3', '11.1.2.3', true);
-- name: peer_ipv6_outside_network
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, '2001:db9::1', '2001:db8::/32', '2001:db9::', '2001:db9:ffff:ffff:ffff:ffff:ffff:ffff', '2001:db9::1', '2001:db9::1', true);
-- name: peer_family_mismatch
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, '::1', '10/8', '::', '::ffff', '::1', '::1', true);
-- name: peer_below_range
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, '10.0.0.1', '10/8', '10.0.0.2', '10.255.255.255', '10.0.0.1', '10.0.0.1', true);
-- name: peer_above_range
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, '10.0.0.3', '10/8', '10.0.0.1', '10.0.0.2', '10.0.0.3', '10.0.0.3', true);
-- name: peer_prefix_order_before_host_bits
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, '10.255.255.255/8', '10/8', '10.0.0.0/16', '11.0.0.0', '10.255.255.255/8', '10.255.255.255/8', true);
-- name: peer_wrong_recording
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, '10.1.2.3', '10/8', '10.0.0.0', '10.255.255.255', '10.1.2.3', '10.1.2.4', true);
-- name: peer_selected_backup_disagrees
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, '10.1.2.3', '10/8', '10.0.0.0', '10.255.255.255', '10.1.2.4', '10.1.2.3', false);
-- name: peer_null_primary_uses_backup
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, NULL, '10/8', '10.0.0.0', '10.255.255.255', '10.1.2.3', '10.1.2.3', false);
-- name: peer_null_primary_wrong_backup
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, NULL, '10/8', '10.0.0.0', '10.255.255.255', '10.1.2.3', '10.1.2.4', false);
-- name: peer_nulls_pass
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
-- name: peer_ipv4_mapped_ipv6
INSERT INTO network_peers (id, address, allowed, floor_address, ceiling_address, backup_address, recorded_address, prefer_primary) VALUES (2, '::ffff:192.0.2.1', '::ffff:192.0.2.0/120', '::ffff:192.0.2.0', '::ffff:192.0.2.255', '::ffff:192.0.2.1', '::ffff:192.0.2.1', true);
-- name: subnet_ipv4_allowed
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (2, '10.1/16', '10/8', '192.168/16');
-- name: subnet_ipv6_allowed
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (2, '2001:db8:1::/48', '2001:db8::/32', '2001:db9::/32');
-- name: subnet_equal_is_not_strict
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (2, '10/8', '10/8', '192.168/16');
-- name: subnet_parent_too_narrow
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (2, '10/8', '10.1/16', '192.168/16');
-- name: subnet_different_family
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (2, '2001:db8::/32', '10/8', '192.168/16');
-- name: subnet_overlaps_forbidden
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (2, '10.1/16', '10/8', '10.1.2/24');
-- name: subnet_inside_forbidden
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (2, '10.1.2/24', '10/8', '10.1/16');
-- name: subnet_ipv6_overlap
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (2, '2001:db8:1::/48', '2001:db8::/32', '2001:db8:1::/64');
-- name: subnet_zero_prefix_parent
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (2, '10/8', '0/0', '192.168/16');
-- name: subnet_hex_input
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (2, '0x0a01/16', '0x0a/8', '192.168/16');
-- name: subnet_nulls_pass
INSERT INTO network_subnets (id, subnet, parent_network, forbidden_network) VALUES (2, NULL, NULL, NULL);
-- name: import_ipv4
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, '10.0.0.1', '10/8', '10.0.0.1', '10/8', false);
-- name: import_ipv6
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, '2001:DB8::1', '2001:db8::/32', '2001:db8::1', '2001:db8::/32', false);
-- name: import_hex_cidr
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, '10.1.0.1', '0x0a01/16', '10.1.0.1', '10.1/16', false);
-- name: import_address_disagrees
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, '10.0.0.2', '10/8', '10.0.0.1', '10/8', false);
-- name: import_network_disagrees
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, '10.0.0.1', '11/8', '10.0.0.1', '10/8', false);
-- name: import_invalid_address
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, '256.0.0.1', '10/8', '10.0.0.1', '10/8', false);
-- name: import_invalid_prefix
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, '10.0.0.1/33', '10/8', '10.0.0.1', '10/8', false);
-- name: import_empty_address
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, '', '10/8', '10.0.0.1', '10/8', false);
-- name: import_cidr_host_bits
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, '10.0.0.1', '10.0.0.1/8', '10.0.0.1', '10/8', false);
-- name: import_cidr_ipv6_host_bits
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, '2001:db8::1', '2001:db8::1/32', '2001:db8::1', '2001:db8::/32', false);
-- name: import_cidr_invalid_address
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, '10.0.0.1', 'not a subnet', '10.0.0.1', '10/8', false);
-- name: import_invalid_skipped
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, 'not an address', 'not a subnet', '10.0.0.1', '10/8', true);
-- name: import_nulls_pass
INSERT INTO network_imports (id, raw_address, raw_network, expected_address, expected_network, skip_import) VALUES (2, NULL, NULL, NULL, NULL, false);
-- name: allocation_ipv4_carry
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '10.0.0.255', 1, '10.0.1.0', '10.0.0.254', 1);
-- name: allocation_ipv4_borrow
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '10.0.1.0', -1, '10.0.0.255', '10.0.0.255', 1);
-- name: allocation_preserves_mask
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '10.0.0.255/8', 1, '10.0.1.0/8', '10.0.0.255/24', 0);
-- name: allocation_ipv6_word_carry
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '2001:db8::ffff', 1, '2001:db8::1:0', '2001:db8::fffe', 1);
-- name: allocation_ipv6_bigint_max
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '::', 9223372036854775807, '::7fff:ffff:ffff:ffff', '::', 0);
-- name: allocation_ipv6_bigint_min_add
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '::8000:0:0:1', -9223372036854775808, '::1', '::8000:0:0:1', 0);
-- name: allocation_bigint_min_subtract_wrap
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '0:0:0:1::', -9223372036854775808, '::8000:0:0:0', '0:0:0:1::', 0);
-- name: allocation_wrong_shift
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '10.0.0.1', 1, '10.0.0.3', '10.0.0.1', 0);
-- name: allocation_wrong_distance
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '10.0.0.1', 1, '10.0.0.2', '10.0.0.0', 2);
-- name: allocation_ipv4_overflow
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '255.255.255.255', 1, '0.0.0.0', '255.255.255.255', 0);
-- name: allocation_ipv4_underflow
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '0.0.0.0', -1, '0.0.0.0', '0.0.0.0', 0);
-- name: allocation_ipv6_overflow
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 1, '::', 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 0);
-- name: allocation_ipv6_underflow
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '::', -1, '::', '::', 0);
-- name: allocation_restore_disagrees
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '::1', 0, '::', '::1', 0);
-- name: allocation_distance_different_family
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '::1', 1, '::2', '0.0.0.1', 0);
-- name: allocation_distance_overflow
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '0:0:0:1::', 1, '::1:0:0:0:1', '::', 0);
-- name: allocation_distance_negative_overflow
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '::', 1, '::1', '::8000:0:0:1', 0);
-- name: allocation_full_ipv6_difference_wraps
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, '::', 1, '::1', 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 1);
-- name: allocation_nulls_pass
INSERT INTO network_allocations (id, address, address_offset, allocated_address, comparison_address, address_distance) VALUES (2, NULL, NULL, NULL, NULL, NULL);
