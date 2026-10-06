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

-- name: priority_prefix_before_host
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '10.0.0.255/8', '10.0.0.1/32', -24, '10.0.0.1/32', '10.0.0.255/8', true, '10.0.0.1/32');

-- name: priority_reverse_prefix_difference
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '10.0.0.1/32', '10.0.0.255/8', 24, '10.0.0.1/32', '10.0.0.255/8', false, '10.0.0.255/8');

-- name: priority_whole_byte_difference
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '0.0.0.0', '255.255.255.255', -255, '255.255.255.255', '0.0.0.0', true, '255.255.255.255');

-- name: priority_ipv6_whole_byte_difference
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '::ffff', '::', 255, '::ffff', '::', false, '::');

-- name: priority_partial_byte_difference
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '192.0.0.0/2', '128.0.0.0/2', 1, '192.0.0.0/2', '128.0.0.0/2', true, '192.0.0.0/2');

-- name: priority_ipv6_partial_byte_difference
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '2001:db8:0:0:8000::/65', '2001:db8::/65', 1, '2001:db8:0:0:8000::/65', '2001:db8::/65', false, '2001:db8::/65');

-- name: priority_zero_prefix_host_difference
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '10.0.0.1/0', '10.0.0.255/0', -254, '10.0.0.255/0', '10.0.0.1/0', true, '10.0.0.255/0');

-- name: priority_ipv6_full_prefix_difference
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '::1/0', '::1/128', -128, '::1/128', '::1/0', false, '::1/0');

-- name: priority_ipv4_before_ipv6
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '255.255.255.255', '::', -1, '::', '255.255.255.255', true, '::');

-- name: priority_ipv6_after_ipv4
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '::', '255.255.255.255', 1, '::', '255.255.255.255', false, '255.255.255.255');

-- name: priority_equal_addresses
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '2001:db8::1', '2001:db8:0:0:0:0:0:1', 0, '2001:db8::1', '2001:db8::1', true, '2001:db8::1');

-- name: priority_incorrect_normalized_comparison
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '0.0.0.0', '255.255.255.255', -1, '255.255.255.255', '0.0.0.0', true, '255.255.255.255');

-- name: priority_incorrect_larger
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '10.0.0.1', '10.0.0.2', -1, '10.0.0.1', '10.0.0.1', false, '10.0.0.1');

-- name: priority_incorrect_smaller
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '10.0.0.1', '10.0.0.2', -1, '10.0.0.2', '10.0.0.2', true, '10.0.0.2');

-- name: priority_incorrect_selected
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '10.0.0.1', '10.0.0.2', -1, '10.0.0.2', '10.0.0.1', true, '10.0.0.1');

-- name: priority_null_first
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, NULL, '10.0.0.2', -1, '10.0.0.2', '10.0.0.1', true, '10.0.0.2');

-- name: priority_null_second
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '10.0.0.1', NULL, -1, '10.0.0.2', '10.0.0.1', false, '10.0.0.1');

-- name: priority_null_outputs
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '10.0.0.1', '10.0.0.2', NULL, NULL, NULL, true, NULL);

-- name: priority_null_preference_selects_smaller
INSERT INTO network_priorities (id, first_address, second_address, comparison_result, larger_address, smaller_address, prefer_larger, selected_address) VALUES (100, '10.0.0.1', '10.0.0.2', -1, '10.0.0.2', '10.0.0.1', NULL, '10.0.0.1');

-- name: output_null
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (1, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- name: output_1
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (2, '10.1.2.3/32', '10.1.2.3/32', 0, '10.1.2.3', '10.1.2.3/32', '10.1.2.3', '10.1.2.3/32', '\x022000040a010203', '\x022001040a010203', 1464440404, 468164686702548564);

-- name: output_2
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (3, '10.1.2.3/24', '10.1.2.0/24', 1, '10.1.2.3', '10.1.2.3/24', '10.1.2.3/24', '10.1.2/24', '\x021800040a010203', '\x021801040a010200', 1074326899, -4272391789629553272);

-- name: output_3
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (4, '0.0.0.0/0', '0.0.0.0/0', -1, '0.0.0.0', '0.0.0.0/0', '0.0.0.0/0', '0/0', '\x0200000400000000', '\x0200010400000000', -1053905972, -5968335589437008529);

-- name: output_4
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (5, '255.255.255.255/32', '255.255.255.255/32', 9223372036854775807, '255.255.255.255', '255.255.255.255/32', '255.255.255.255', '255.255.255.255/32', '\x02200004ffffffff', '\x02200104ffffffff', -1013336768, 4368588769894212371);

-- name: output_5
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (6, '::/128', '::/128', -9223372036854775808, '::', '::/128', '::', '::/128', '\x0380001000000000000000000000000000000000', '\x0380011000000000000000000000000000000000', -1216017092, 8125171125098989797);

-- name: output_6
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (7, '::1/128', '::1/128', 0, '::1', '::1/128', '::1', '::1/128', '\x0380001000000000000000000000000000000001', '\x0380011000000000000000000000000000000001', 1984372031, -973879421452214977);

-- name: output_7
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (8, '2001:db8::1/65', '2001:db8::/65', 4294967296, '2001:db8::1', '2001:db8::1/65', '2001:db8::1/65', '2001:db8::/65', '\x0341001020010db8000000000000000000000001', '\x0341011020010db8000000000000000000000000', -1375690503, -1375766532026040662);

-- name: output_8
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (9, '::ffff:192.0.2.129/120', '::ffff:192.0.2.0/120', -4294967297, '::ffff:192.0.2.129', '::ffff:192.0.2.129/120', '::ffff:192.0.2.129/120', '::ffff:192.0.2/120', '\x0378001000000000000000000000ffffc0000281', '\x0378011000000000000000000000ffffc0000200', 1907902212, 3300151646970973118);

-- name: output_9
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (10, '::192.0.2.129/112', '::192.0.0.0/112', -1, '::192.0.2.129', '::192.0.2.129/112', '::192.0.2.129/112', '::192.0/112', '\x03700010000000000000000000000000c0000281', '\x03700110000000000000000000000000c0000000', 1418265561, -4808814117578577675);

-- name: output_10
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (11, '1::2:0:0:3:4/97', '1:0:0:2::/97', 1, '1::2:0:0:3:4', '1::2:0:0:3:4/97', '1::2:0:0:3:4/97', '1:0:0:2::/97', '\x0361001000010000000000020000000000030004', '\x0361011000010000000000020000000000000000', -623762959, 7630558224841208189);

-- name: output_11
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (12, '1:0:2:0:3:0:4:0/128', '1:0:2:0:3:0:4:0/128', 0, '1:0:2:0:3:0:4:0', '1:0:2:0:3:0:4:0/128', '1:0:2:0:3:0:4:0', '1:0:2::0:4:0/128', '\x0380001000010000000200000003000000040000', '\x0380011000010000000200000003000000040000', -1785320547, 6681915014147091357);

-- name: output_reject_host_text
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (13, '10.1.2.3/32', '10.1.2.3/32', 0, 'wrong', '10.1.2.3/32', '10.1.2.3', '10.1.2.3/32', '\x022000040a010203', '\x022001040a010203', 1464440404, 468164686702548564);

-- name: output_reject_full_text
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (14, '10.1.2.3/32', '10.1.2.3/32', 0, '10.1.2.3', 'wrong', '10.1.2.3', '10.1.2.3/32', '\x022000040a010203', '\x022001040a010203', 1464440404, 468164686702548564);

-- name: output_reject_short_text
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (15, '10.1.2.3/32', '10.1.2.3/32', 0, '10.1.2.3', '10.1.2.3/32', 'wrong', '10.1.2.3/32', '\x022000040a010203', '\x022001040a010203', 1464440404, 468164686702548564);

-- name: output_reject_subnet_text
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (16, '10.1.2.3/32', '10.1.2.3/32', 0, '10.1.2.3', '10.1.2.3/32', '10.1.2.3', 'wrong', '\x022000040a010203', '\x022001040a010203', 1464440404, 468164686702548564);

-- name: output_reject_address_bytes
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (17, '10.1.2.3/32', '10.1.2.3/32', 0, '10.1.2.3', '10.1.2.3/32', '10.1.2.3', '10.1.2.3/32', '\x00', '\x022001040a010203', 1464440404, 468164686702548564);

-- name: output_reject_subnet_bytes
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (18, '10.1.2.3/32', '10.1.2.3/32', 0, '10.1.2.3', '10.1.2.3/32', '10.1.2.3', '10.1.2.3/32', '\x022000040a010203', '\x00', 1464440404, 468164686702548564);

-- name: output_reject_hash_value
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (19, '10.1.2.3/32', '10.1.2.3/32', 0, '10.1.2.3', '10.1.2.3/32', '10.1.2.3', '10.1.2.3/32', '\x022000040a010203', '\x022001040a010203', 0, 468164686702548564);

-- name: output_reject_seeded_hash
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (20, '10.1.2.3/32', '10.1.2.3/32', 0, '10.1.2.3', '10.1.2.3/32', '10.1.2.3', '10.1.2.3/32', '\x022000040a010203', '\x022001040a010203', 1464440404, 0);

-- name: output_null_seed
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (21, '10.1.2.3/32', '10.1.2.3/32', NULL, '10.1.2.3', '10.1.2.3/32', '10.1.2.3', '10.1.2.3/32', '\x022000040a010203', '\x022001040a010203', 1464440404, 0);

-- name: output_empty_host
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (22, '10.1.2.3/32', '10.1.2.3/32', 0, '', '10.1.2.3/32', '10.1.2.3', '10.1.2.3/32', '\x022000040a010203', '\x022001040a010203', 1464440404, 468164686702548564);

-- name: output_null_expected
INSERT INTO network_outputs (id, address, subnet, hash_seed, host_text, full_text, short_text, subnet_text, address_bytes, subnet_bytes, hash_value, seeded_hash) VALUES (23, '10.1.2.3/32', '10.1.2.3/32', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
-- name: device_input_format_0
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:01:02:03', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, -1);
-- name: device_input_format_1
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08-00-2b-01-02-03', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, -1);
-- name: device_input_format_2
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08002b:010203', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, -1);
-- name: device_input_format_3
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08002b-010203', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, -1);
-- name: device_input_format_4
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '0800.2b01.0203', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, -1);
-- name: device_input_format_5
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '0800-2b01-0203', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, -1);
-- name: device_input_format_6
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08002b010203', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, -1);
-- name: device_null_address
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, NULL, '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, -1);
-- name: device_all_null
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
-- name: device_null_range
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:01:02:03', NULL, NULL, '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, -1);
-- name: device_null_selected
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:01:02:03', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', NULL, true, -1);
-- name: device_zero_address
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '00:00:00:00:00:00', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '00:00:00:00:00:00', '00:00:00:00:00:00', true, -1);
-- name: device_broadcast_address
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, 'ff:ff:ff:ff:ff:ff', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', 'ff:ff:ff:ff:ff:ff', 'ff:ff:ff:ff:ff:ff', true, 1);
-- name: device_below_range
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:01:02:03', '10:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, -1);
-- name: device_above_range
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:01:02:03', '00:00:00:00:00:00', '00:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, 1);
-- name: device_forbidden
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:01:02:03', '00:00:00:00:00:00', '10:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, -1);
-- name: device_wrong_comparison
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:01:02:03', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, 1);
-- name: device_wrong_recorded
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:01:02:03', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '09:00:00:00:00:00', true, -1);
-- name: device_selected_backup
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, NULL, '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '09:00:00:00:00:00', '09:00:00:00:00:00', false, -1);
-- name: device_wrong_backup
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:01:02:03', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', false, -1);
-- name: device_uppercase
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2B:01:02:03', '00:00:00:00:00:00', '10:00:00:00:00:00', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, -1);
-- name: device_equal_ceiling
INSERT INTO hardware_devices (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:01:02:03', '00:00:00:00:00:00', '08:00:2b:01:02:03', '09:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', true, 0);
-- name: interface_input_format_0
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:ff:fe:01:02:03', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_1
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08-00-2b-ff-fe-01-02-03', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_2
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08002b:fffe010203', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_3
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08002b-fffe010203', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_4
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '0800.2bff.fe01.0203', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_5
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08002bff:fe010203', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_6
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08002bfffe010203', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_7
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:01:02:03', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_8
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08-00-2b-01-02-03', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_9
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08002b:010203', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_10
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08002b-010203', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_11
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '0800.2b01.0203', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_12
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '0800-2b01-0203', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_input_format_13
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08002b010203', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_null_address
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, NULL, '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_all_null
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
-- name: interface_null_range
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:ff:fe:01:02:03', NULL, NULL, '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_null_selected
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:ff:fe:01:02:03', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', NULL, true, -1);
-- name: interface_zero_address
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '00:00:00:00:00:00:00:00', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '00:00:00:00:00:00:00:00', '00:00:00:00:00:00:00:00', true, -1);
-- name: interface_broadcast_address
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, 'ff:ff:ff:ff:ff:ff:ff:ff', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', 'ff:ff:ff:ff:ff:ff:ff:ff', 'ff:ff:ff:ff:ff:ff:ff:ff', true, 1);
-- name: interface_below_range
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:ff:fe:01:02:03', '10:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_above_range
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:ff:fe:01:02:03', '00:00:00:00:00:00:00:00', '00:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, 1);
-- name: interface_forbidden
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:ff:fe:01:02:03', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_wrong_comparison
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:ff:fe:01:02:03', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, 1);
-- name: interface_wrong_recorded
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:ff:fe:01:02:03', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '09:00:00:00:00:00:00:00', true, -1);
-- name: interface_selected_backup
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, NULL, '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', false, -1);
-- name: interface_wrong_backup
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:ff:fe:01:02:03', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', false, -1);
-- name: interface_uppercase
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2B:FF:FE:01:02:03', '00:00:00:00:00:00:00:00', '10:00:00:00:00:00:00:00', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, -1);
-- name: interface_equal_ceiling
INSERT INTO hardware_interfaces (id, address, floor_address, ceiling_address, forbidden_address, backup_address, recorded_address, prefer_primary, comparison_result) VALUES (2, '08:00:2b:ff:fe:01:02:03', '00:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '09:00:00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', true, 0);
-- name: hardware_mask_valid
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, '08:00:2b:01:02:03', 'ff:ff:ff:00:00:00', 'f7:ff:d4:fe:fd:fc', '08:00:2b:00:00:00', 'ff:ff:ff:01:02:03', '08:00:2b:00:00:00', '08:00:2b:ff:fe:01:02:03', 'ff:ff:ff:00:00:00:00:00', 'f7:ff:d4:00:01:fe:fd:fc', '08:00:2b:00:00:00:00:00', 'ff:ff:ff:ff:fe:01:02:03', '08:00:2b:00:00:00:00:00', '0a:00:2b:ff:fe:01:02:03');
-- name: hardware_mask_null
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
-- name: hardware_mask_missing_inputs
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, NULL, 'ff:ff:ff:00:00:00', 'f7:ff:d4:fe:fd:fc', '08:00:2b:00:00:00', 'ff:ff:ff:01:02:03', '08:00:2b:00:00:00', NULL, 'ff:ff:ff:00:00:00:00:00', 'f7:ff:d4:00:01:fe:fd:fc', '08:00:2b:00:00:00:00:00', 'ff:ff:ff:ff:fe:01:02:03', '08:00:2b:00:00:00:00:00', '0a:00:2b:ff:fe:01:02:03');
-- name: hardware_mask_set_bit_already
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, '08:00:2b:01:02:03', 'ff:ff:ff:00:00:00', 'f7:ff:d4:fe:fd:fc', '08:00:2b:00:00:00', 'ff:ff:ff:01:02:03', '08:00:2b:00:00:00', '0a:00:2b:ff:fe:01:02:03', 'ff:ff:ff:00:00:00:00:00', 'f5:ff:d4:00:01:fe:fd:fc', '0a:00:2b:00:00:00:00:00', 'ff:ff:ff:ff:fe:01:02:03', '0a:00:2b:00:00:00:00:00', '0a:00:2b:ff:fe:01:02:03');
-- name: hardware_wrong_inverted6
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, '08:00:2b:01:02:03', 'ff:ff:ff:00:00:00', '00:00:00:00:00:00', '08:00:2b:00:00:00', 'ff:ff:ff:01:02:03', '08:00:2b:00:00:00', '08:00:2b:ff:fe:01:02:03', 'ff:ff:ff:00:00:00:00:00', 'f7:ff:d4:00:01:fe:fd:fc', '08:00:2b:00:00:00:00:00', 'ff:ff:ff:ff:fe:01:02:03', '08:00:2b:00:00:00:00:00', '0a:00:2b:ff:fe:01:02:03');
-- name: hardware_wrong_intersection6
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, '08:00:2b:01:02:03', 'ff:ff:ff:00:00:00', 'f7:ff:d4:fe:fd:fc', '00:00:00:00:00:00', 'ff:ff:ff:01:02:03', '08:00:2b:00:00:00', '08:00:2b:ff:fe:01:02:03', 'ff:ff:ff:00:00:00:00:00', 'f7:ff:d4:00:01:fe:fd:fc', '08:00:2b:00:00:00:00:00', 'ff:ff:ff:ff:fe:01:02:03', '08:00:2b:00:00:00:00:00', '0a:00:2b:ff:fe:01:02:03');
-- name: hardware_wrong_union6
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, '08:00:2b:01:02:03', 'ff:ff:ff:00:00:00', 'f7:ff:d4:fe:fd:fc', '08:00:2b:00:00:00', '00:00:00:00:00:00', '08:00:2b:00:00:00', '08:00:2b:ff:fe:01:02:03', 'ff:ff:ff:00:00:00:00:00', 'f7:ff:d4:00:01:fe:fd:fc', '08:00:2b:00:00:00:00:00', 'ff:ff:ff:ff:fe:01:02:03', '08:00:2b:00:00:00:00:00', '0a:00:2b:ff:fe:01:02:03');
-- name: hardware_wrong_manufacturer6
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, '08:00:2b:01:02:03', 'ff:ff:ff:00:00:00', 'f7:ff:d4:fe:fd:fc', '08:00:2b:00:00:00', 'ff:ff:ff:01:02:03', '00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', 'ff:ff:ff:00:00:00:00:00', 'f7:ff:d4:00:01:fe:fd:fc', '08:00:2b:00:00:00:00:00', 'ff:ff:ff:ff:fe:01:02:03', '08:00:2b:00:00:00:00:00', '0a:00:2b:ff:fe:01:02:03');
-- name: hardware_wrong_inverted8
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, '08:00:2b:01:02:03', 'ff:ff:ff:00:00:00', 'f7:ff:d4:fe:fd:fc', '08:00:2b:00:00:00', 'ff:ff:ff:01:02:03', '08:00:2b:00:00:00', '08:00:2b:ff:fe:01:02:03', 'ff:ff:ff:00:00:00:00:00', '00:00:00:00:00:00:00:00', '08:00:2b:00:00:00:00:00', 'ff:ff:ff:ff:fe:01:02:03', '08:00:2b:00:00:00:00:00', '0a:00:2b:ff:fe:01:02:03');
-- name: hardware_wrong_intersection8
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, '08:00:2b:01:02:03', 'ff:ff:ff:00:00:00', 'f7:ff:d4:fe:fd:fc', '08:00:2b:00:00:00', 'ff:ff:ff:01:02:03', '08:00:2b:00:00:00', '08:00:2b:ff:fe:01:02:03', 'ff:ff:ff:00:00:00:00:00', 'f7:ff:d4:00:01:fe:fd:fc', '00:00:00:00:00:00:00:00', 'ff:ff:ff:ff:fe:01:02:03', '08:00:2b:00:00:00:00:00', '0a:00:2b:ff:fe:01:02:03');
-- name: hardware_wrong_union8
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, '08:00:2b:01:02:03', 'ff:ff:ff:00:00:00', 'f7:ff:d4:fe:fd:fc', '08:00:2b:00:00:00', 'ff:ff:ff:01:02:03', '08:00:2b:00:00:00', '08:00:2b:ff:fe:01:02:03', 'ff:ff:ff:00:00:00:00:00', 'f7:ff:d4:00:01:fe:fd:fc', '08:00:2b:00:00:00:00:00', '00:00:00:00:00:00:00:00', '08:00:2b:00:00:00:00:00', '0a:00:2b:ff:fe:01:02:03');
-- name: hardware_wrong_manufacturer8
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, '08:00:2b:01:02:03', 'ff:ff:ff:00:00:00', 'f7:ff:d4:fe:fd:fc', '08:00:2b:00:00:00', 'ff:ff:ff:01:02:03', '08:00:2b:00:00:00', '08:00:2b:ff:fe:01:02:03', 'ff:ff:ff:00:00:00:00:00', 'f7:ff:d4:00:01:fe:fd:fc', '08:00:2b:00:00:00:00:00', 'ff:ff:ff:ff:fe:01:02:03', '00:00:00:00:00:00:00:00', '0a:00:2b:ff:fe:01:02:03');
-- name: hardware_wrong_modified8
INSERT INTO hardware_masks (id, address6, mask6, inverted6, intersection6, union6, manufacturer6, address8, mask8, inverted8, intersection8, union8, manufacturer8, modified8) VALUES (2, '08:00:2b:01:02:03', 'ff:ff:ff:00:00:00', 'f7:ff:d4:fe:fd:fc', '08:00:2b:00:00:00', 'ff:ff:ff:01:02:03', '08:00:2b:00:00:00', '08:00:2b:ff:fe:01:02:03', 'ff:ff:ff:00:00:00:00:00', 'f7:ff:d4:00:01:fe:fd:fc', '08:00:2b:00:00:00:00:00', 'ff:ff:ff:ff:fe:01:02:03', '08:00:2b:00:00:00:00:00', '00:00:00:00:00:00:00:00');
-- name: hardware_cast_valid
INSERT INTO hardware_conversions (id, address6, address8, extended_address, short_address, selected_short, selected_extended, prefer_extended) VALUES (2, '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_cast_select_primary
INSERT INTO hardware_conversions (id, address6, address8, extended_address, short_address, selected_short, selected_extended, prefer_extended) VALUES (2, '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', true);
-- name: hardware_cast_null
INSERT INTO hardware_conversions (id, address6, address8, extended_address, short_address, selected_short, selected_extended, prefer_extended) VALUES (2, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
-- name: hardware_cast_null_short
INSERT INTO hardware_conversions (id, address6, address8, extended_address, short_address, selected_short, selected_extended, prefer_extended) VALUES (2, NULL, '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_cast_null_extended
INSERT INTO hardware_conversions (id, address6, address8, extended_address, short_address, selected_short, selected_extended, prefer_extended) VALUES (2, '08:00:2b:01:02:03', NULL, '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_cast_bad_middle_low
INSERT INTO hardware_conversions (id, address6, address8, extended_address, short_address, selected_short, selected_extended, prefer_extended) VALUES (2, '08:00:2b:01:02:03', '08:00:2b:ff:ff:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', NULL, false);
-- name: hardware_cast_bad_middle_high
INSERT INTO hardware_conversions (id, address6, address8, extended_address, short_address, selected_short, selected_extended, prefer_extended) VALUES (2, '08:00:2b:01:02:03', '08:00:2b:fe:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', NULL, true);
-- name: hardware_cast_bad_fallback
INSERT INTO hardware_conversions (id, address6, address8, extended_address, short_address, selected_short, selected_extended, prefer_extended) VALUES (2, NULL, '08:00:2b:00:00:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', NULL, false);
-- name: hardware_cast_wrong_extend
INSERT INTO hardware_conversions (id, address6, address8, extended_address, short_address, selected_short, selected_extended, prefer_extended) VALUES (2, '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', '00:00:00:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_cast_wrong_shorten
INSERT INTO hardware_conversions (id, address6, address8, extended_address, short_address, selected_short, selected_extended, prefer_extended) VALUES (2, '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', '00:00:00:00:00:00', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_cast_wrong_short_selection
INSERT INTO hardware_conversions (id, address6, address8, extended_address, short_address, selected_short, selected_extended, prefer_extended) VALUES (2, '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_cast_wrong_extended_selection
INSERT INTO hardware_conversions (id, address6, address8, extended_address, short_address, selected_short, selected_extended, prefer_extended) VALUES (2, '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '00:00:00:00:00:00:00:00', false);
-- name: hardware_import_valid
INSERT INTO hardware_imports (id, raw_short, raw_extended, raw_varchar, short_address, extended_address, skip_import) VALUES (2, '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_import_null
INSERT INTO hardware_imports (id, raw_short, raw_extended, raw_varchar, short_address, extended_address, skip_import) VALUES (2, NULL, NULL, NULL, NULL, NULL, NULL);
-- name: hardware_import_grouped
INSERT INTO hardware_imports (id, raw_short, raw_extended, raw_varchar, short_address, extended_address, skip_import) VALUES (2, '0800.2b01.0203', '0800:2bff:fe01:0203', '08002b010203', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_import_bad_short
INSERT INTO hardware_imports (id, raw_short, raw_extended, raw_varchar, short_address, extended_address, skip_import) VALUES (2, 'garbage', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_import_bad_extended
INSERT INTO hardware_imports (id, raw_short, raw_extended, raw_varchar, short_address, extended_address, skip_import) VALUES (2, '08:00:2b:01:02:03', '08:00-2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_import_bad_varchar
INSERT INTO hardware_imports (id, raw_short, raw_extended, raw_varchar, short_address, extended_address, skip_import) VALUES (2, '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', 'garbage', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_import_octet_range
INSERT INTO hardware_imports (id, raw_short, raw_extended, raw_varchar, short_address, extended_address, skip_import) VALUES (2, '100:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_import_negative_octet
INSERT INTO hardware_imports (id, raw_short, raw_extended, raw_varchar, short_address, extended_address, skip_import) VALUES (2, '-1:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_import_wrapped_octet
INSERT INTO hardware_imports (id, raw_short, raw_extended, raw_varchar, short_address, extended_address, skip_import) VALUES (2, '100000008:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_import_wrong_short
INSERT INTO hardware_imports (id, raw_short, raw_extended, raw_varchar, short_address, extended_address, skip_import) VALUES (2, '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '00:00:00:00:00:00', '08:00:2b:ff:fe:01:02:03', false);
-- name: hardware_import_wrong_extended
INSERT INTO hardware_imports (id, raw_short, raw_extended, raw_varchar, short_address, extended_address, skip_import) VALUES (2, '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', '08:00:2b:01:02:03', '08:00:2b:01:02:03', '00:00:00:00:00:00:00:00', false);
-- name: hardware_import_skip_bad
INSERT INTO hardware_imports (id, raw_short, raw_extended, raw_varchar, short_address, extended_address, skip_import) VALUES (2, 'garbage', 'garbage', 'garbage', '08:00:2b:01:02:03', '08:00:2b:ff:fe:01:02:03', true);
