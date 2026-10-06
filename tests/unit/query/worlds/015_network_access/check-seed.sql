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

-- name: plan_ipv4_host_bits
INSERT INTO network_plans (id, address, peer_address, address_family, prefix_length, same_family, network_address, broadcast_address, network_mask, host_mask, converted_network, combined_network) VALUES (100, '10.1.2.3/24', '10.1.3.4/24', 4, 24, true, '10.1.2.0/24', '10.1.2.255/24', '255.255.255.0', '0.0.0.255', '10.1.2.0/24', '10.1.2.0/23');

-- name: plan_ipv6_partial_word
INSERT INTO network_plans (id, address, peer_address, address_family, prefix_length, same_family, network_address, broadcast_address, network_mask, host_mask, converted_network, combined_network) VALUES (100, '2001:db8:0:0:8000::1/65', '2001:db8::1/65', 6, 65, true, '2001:db8:0:0:8000::/65', '2001:db8::ffff:ffff:ffff:ffff/65', 'ffff:ffff:ffff:ffff:8000::', '::7fff:ffff:ffff:ffff', '2001:db8:0:0:8000::/65', '2001:db8::/64');

-- name: plan_ipv4_partial_word
INSERT INTO network_plans (id, address, peer_address, address_family, prefix_length, same_family, network_address, broadcast_address, network_mask, host_mask, converted_network, combined_network) VALUES (100, '10.128.2.3/17', '10.128.2.4/32', 4, 17, true, '10.128.0.0/17', '10.128.127.255/17', '255.255.128.0', '0.0.127.255', '10.128.0.0/17', '10.128.0.0/17');

-- name: plan_ipv4_zero_prefix
INSERT INTO network_plans (id, address, peer_address, address_family, prefix_length, same_family, network_address, broadcast_address, network_mask, host_mask, converted_network, combined_network) VALUES (100, '10.1.2.3/0', '192.168.1.1', 4, 0, true, '0.0.0.0/0', '255.255.255.255/0', '0.0.0.0', '255.255.255.255', '0.0.0.0/0', '0.0.0.0/0');

-- name: plan_ipv6_zero_prefix
INSERT INTO network_plans (id, address, peer_address, address_family, prefix_length, same_family, network_address, broadcast_address, network_mask, host_mask, converted_network, combined_network) VALUES (100, '::1/0', '2001:db8::1', 6, 0, true, '::/0', 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff/0', '::', 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', '::/0', '::/0');

-- name: plan_ipv6_full_prefix
INSERT INTO network_plans (id, address, peer_address, address_family, prefix_length, same_family, network_address, broadcast_address, network_mask, host_mask, converted_network, combined_network) VALUES (100, '::1', '::1', 6, 128, true, '::1/128', '::1', 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', '::', '::1/128', '::1/128');

-- name: plan_incorrect_family
INSERT INTO network_plans (id, address, address_family) VALUES (100, '10.1.2.3', 6);

-- name: plan_incorrect_prefix
INSERT INTO network_plans (id, address, prefix_length) VALUES (100, '10.1.2.3/24', 32);

-- name: plan_different_families_reported_same
INSERT INTO network_plans (id, address, peer_address, same_family) VALUES (100, '10.1.2.3', '::1', true);

-- name: plan_network_preserved_host_bits
INSERT INTO network_plans (id, address, network_address) VALUES (100, '10.1.2.3/24', '10.1.2.3/32');

-- name: plan_incorrect_broadcast
INSERT INTO network_plans (id, address, broadcast_address) VALUES (100, '10.1.2.3/24', '10.1.2.254/24');

-- name: plan_incorrect_netmask
INSERT INTO network_plans (id, address, network_mask) VALUES (100, '10.1.2.3/24', '255.255.0.0');

-- name: plan_incorrect_hostmask
INSERT INTO network_plans (id, address, host_mask) VALUES (100, '10.1.2.3/24', '0.0.255.255');

-- name: plan_incorrect_conversion
INSERT INTO network_plans (id, address, converted_network) VALUES (100, '10.1.2.3/24', '10.1.2.0/32');

-- name: plan_merge_too_small
INSERT INTO network_plans (id, address, peer_address, combined_network) VALUES (100, '10.1.2.3/24', '10.1.3.4/24', '10.1.2.0/24');

-- name: plan_merge_different_families
INSERT INTO network_plans (id, address, peer_address, same_family, combined_network) VALUES (100, '10.1.2.3', '::1', false, '10.1.2.3/32');

-- name: plan_null_address
INSERT INTO network_plans (id, address, peer_address, address_family, prefix_length, same_family, network_address, broadcast_address, network_mask, host_mask, converted_network, combined_network) VALUES (100, NULL, '10.1.3.4', 4, 24, true, '10.1.2.0/24', '10.1.2.255/24', '255.255.255.0', '0.0.0.255', '10.1.2.0/24', '10.1.2.0/23');

-- name: resize_ipv4_shrink
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '10.1.2.3/24', '10.1.2.0/24', 16, '10.1.2.3/16', '10.1.0.0/16', false);

-- name: resize_ipv4_grow
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '10.1.2.3/24', '10.1.2.0/24', 32, '10.1.2.3', '10.1.2.0/32', false);

-- name: resize_ipv6_shrink
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '2001:db8:0:0:8000::1/65', '2001:db8:0:0:8000::/65', 64, '2001:db8:0:0:8000::1/64', '2001:db8::/64', false);

-- name: resize_ipv6_grow
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '2001:db8::1/32', '2001:db8::/32', 65, '2001:db8::1/65', '2001:db8::/65', false);

-- name: resize_ipv4_default_full_prefix
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '10.1.2.3/24', '10.1.2.0/24', -1, '10.1.2.3', '10.1.2.0/32', false);

-- name: resize_ipv6_default_full_prefix
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '2001:db8::1/32', '2001:db8::/32', -1, '2001:db8::1', '2001:db8::/128', false);

-- name: resize_zero_prefix
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '10.1.2.3', '10.1.2.0/24', 0, '10.1.2.3/0', '0.0.0.0/0', false);

-- name: resize_inet_incorrectly_cleared_host_bits
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '10.1.2.3/24', '10.1.2.0/24', 16, '10.1.0.0/16', '10.1.0.0/16', false);

-- name: resize_cidr_incorrect_network
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '10.1.2.3/24', '10.1.2.0/24', 16, '10.1.2.3/16', '10.2.0.0/16', false);

-- name: resize_invalid_negative_prefix
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '10.1.2.3/24', '10.1.2.0/24', -2, '10.1.2.3', '10.1.2.0/32', false);

-- name: resize_ipv4_prefix_overflow
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '10.1.2.3/24', '10.1.2.0/24', 33, '10.1.2.3', '10.1.2.0/32', false);

-- name: resize_ipv6_prefix_overflow
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '2001:db8::1/32', '2001:db8::/32', 129, '2001:db8::1', '2001:db8::/128', false);

-- name: resize_skips_invalid_prefix
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '10.1.2.3/24', '10.1.2.0/24', 129, '10.1.2.3', '10.1.2.0/32', true);

-- name: resize_null_prefix
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, '10.1.2.3/24', '10.1.2.0/24', NULL, '10.1.2.3', '10.1.2.0/32', false);

-- name: resize_null_sources
INSERT INTO network_resizes (id, address, subnet, prefix_length, resized_address, resized_subnet, skip_resize) VALUES (100, NULL, NULL, 24, '10.1.2.3/24', '10.1.2.0/24', false);

-- name: filter_ipv4_host_bits
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '10.1.2.3/24', '255.255.255.0', '245.254.253.252/24', '10.1.2.0', '255.255.255.3', false);

-- name: filter_ipv4_preserves_longer_address_prefix
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '10.1.2.3/24', '255.255.255.0/16', '245.254.253.252/24', '10.1.2.0/24', '255.255.255.3/24', false);

-- name: filter_ipv4_preserves_longer_mask_prefix
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '10.1.2.3/16', '255.255.255.0/24', '245.254.253.252/16', '10.1.2.0/24', '255.255.255.3/24', false);

-- name: filter_ipv4_alternating_bits
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '165.90.195.60/17', '90.165.60.195/9', '90.165.60.195/17', '0.0.0.0/17', '255.255.255.255/17', false);

-- name: filter_ipv6_alternating_bits
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, 'a55a:c33c:9669:f00f:5aa5:3cc3:6996:ff0/17', '5aa5:3cc3:6996:ff0:a55a:c33c:9669:f00f/9', '5aa5:3cc3:6996:ff0:a55a:c33c:9669:f00f/17', '::/17', 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff/17', false);

-- name: filter_ipv6_partial_word_mask
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '2001:db8::1/65', 'ffff:ffff:ffff:ffff:8000::', 'dffe:f247:ffff:ffff:ffff:ffff:ffff:fffe/65', '2001:db8::', 'ffff:ffff:ffff:ffff:8000::1', false);

-- name: filter_ipv4_zero_prefix
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '10.1.2.3/0', '0.0.0.0/0', '245.254.253.252/0', '0.0.0.0/0', '10.1.2.3/0', false);

-- name: filter_ipv6_zero_address
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '::', '::1/65', 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', '::', '::1', false);

-- name: filter_ipv4_full_address
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '255.255.255.255', '0.0.0.0', '0.0.0.0', '0.0.0.0', '255.255.255.255', false);

-- name: filter_incorrect_complement
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '10.1.2.3/24', '255.255.255.0', '245.254.253.253/24', '10.1.2.0', '255.255.255.3', false);

-- name: filter_complement_wrong_prefix
INSERT INTO network_filters (id, address, complemented_address) VALUES (100, '10.1.2.3/24', '245.254.253.252/32');

-- name: filter_incorrect_intersection
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '10.1.2.3/24', '255.255.255.0', '245.254.253.252/24', '10.1.2.1', '255.255.255.3', false);

-- name: filter_intersection_wrong_prefix
INSERT INTO network_filters (id, address, address_mask, intersected_address, skip_filter) VALUES (100, '10.1.2.3/16', '255.255.255.0/24', '10.1.2.0/16', false);

-- name: filter_incorrect_union
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '10.1.2.3/24', '255.255.255.0', '245.254.253.252/24', '10.1.2.0', '255.255.255.2', false);

-- name: filter_union_wrong_prefix
INSERT INTO network_filters (id, address, address_mask, united_address, skip_filter) VALUES (100, '10.1.2.3/16', '255.255.255.0/24', '255.255.255.3/16', false);

-- name: filter_ipv4_and_ipv6_error
INSERT INTO network_filters (id, address, address_mask, intersected_address, united_address, skip_filter) VALUES (100, '10.1.2.3', '::1', '10.1.2.3', '10.1.2.3', false);

-- name: filter_ipv6_and_ipv4_error
INSERT INTO network_filters (id, address, address_mask, intersected_address, united_address, skip_filter) VALUES (100, '::1', '10.1.2.3', '::1', '::1', false);

-- name: filter_null_sources
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, NULL, '255.255.255.0', '245.254.253.252/24', '10.1.2.0', '255.255.255.3', false);

-- name: filter_null_mask
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '10.1.2.3/24', NULL, '245.254.253.252/24', '10.1.2.0', '255.255.255.3', false);

-- name: filter_null_outputs
INSERT INTO network_filters (id, address, address_mask, complemented_address, intersected_address, united_address, skip_filter) VALUES (100, '10.1.2.3/24', '255.255.255.0', NULL, NULL, NULL, false);

-- name: filter_skips_mixed_family_error
INSERT INTO network_filters (id, address, address_mask, intersected_address, united_address, skip_filter) VALUES (100, '10.1.2.3', '::1', '10.1.2.3', '10.1.2.3', true);
