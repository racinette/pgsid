-- @world checks
CREATE DOMAIN peer_address AS inet;

CREATE TABLE network_peers (
  id integer PRIMARY KEY,
  address peer_address,
  allowed cidr,
  floor_address inet,
  ceiling_address inet,
  backup_address inet,
  recorded_address inet,
  prefer_primary boolean,
  CONSTRAINT peer_within_allowed CHECK (address <<= allowed),
  CONSTRAINT peer_in_address_range CHECK (address BETWEEN floor_address AND ceiling_address),
  CONSTRAINT peer_default_recorded CHECK (COALESCE(address, backup_address) = recorded_address),
  CONSTRAINT peer_selected_recorded CHECK ((CASE WHEN prefer_primary THEN address ELSE backup_address END) = recorded_address)
);

CREATE TABLE network_subnets (
  id integer PRIMARY KEY,
  subnet cidr,
  parent_network cidr,
  forbidden_network cidr,
  CONSTRAINT subnet_strictly_inside_parent CHECK (subnet << parent_network),
  CONSTRAINT subnet_avoids_forbidden CHECK (NOT (subnet && forbidden_network))
);

CREATE TABLE network_imports (
  id integer PRIMARY KEY,
  raw_address text,
  raw_network text,
  expected_address inet,
  expected_network cidr,
  skip_import boolean,
  CONSTRAINT import_address_parsed CHECK (CASE WHEN skip_import THEN true ELSE raw_address::inet = expected_address END),
  CONSTRAINT import_network_parsed CHECK (CASE WHEN skip_import THEN true ELSE raw_network::cidr = expected_network END)
);

CREATE TABLE network_allocations (
  id integer PRIMARY KEY,
  address inet,
  address_offset bigint,
  allocated_address inet,
  comparison_address inet,
  address_distance bigint,
  CONSTRAINT allocation_shifted CHECK (address + address_offset = allocated_address),
  CONSTRAINT allocation_shifted_reverse CHECK (address_offset + address = allocated_address),
  CONSTRAINT allocation_restored CHECK (allocated_address - address_offset = address),
  CONSTRAINT allocation_distance CHECK (address - comparison_address = address_distance)
);

CREATE TABLE network_plans (
  id integer PRIMARY KEY,
  address inet,
  peer_address inet,
  address_family integer,
  prefix_length integer,
  same_family boolean,
  network_address cidr,
  broadcast_address inet,
  network_mask inet,
  host_mask inet,
  converted_network cidr,
  combined_network cidr,
  CONSTRAINT plan_family CHECK (family(address) = address_family),
  CONSTRAINT plan_prefix CHECK (masklen(address) = prefix_length),
  CONSTRAINT plan_same_family CHECK (inet_same_family(address, peer_address) = same_family),
  CONSTRAINT plan_network CHECK (network(address) = network_address),
  CONSTRAINT plan_broadcast CHECK (broadcast(address) = broadcast_address),
  CONSTRAINT plan_netmask CHECK (netmask(address) = network_mask),
  CONSTRAINT plan_hostmask CHECK (hostmask(address) = host_mask),
  CONSTRAINT plan_converted CHECK (address::cidr = converted_network),
  CONSTRAINT plan_combined CHECK (inet_merge(address, peer_address) = combined_network)
);

CREATE TABLE network_resizes (
  id integer PRIMARY KEY,
  address inet,
  subnet cidr,
  prefix_length integer,
  resized_address inet,
  resized_subnet cidr,
  skip_resize boolean,
  CONSTRAINT resize_address CHECK (CASE WHEN skip_resize THEN true ELSE set_masklen(address, prefix_length) = resized_address END),
  CONSTRAINT resize_subnet CHECK (CASE WHEN skip_resize THEN true ELSE set_masklen(subnet, prefix_length) = resized_subnet END)
);

CREATE TABLE network_filters (
  id integer PRIMARY KEY,
  address inet,
  address_mask inet,
  complemented_address inet,
  intersected_address inet,
  united_address inet,
  skip_filter boolean,
  CONSTRAINT filter_complement CHECK (~address = complemented_address),
  CONSTRAINT filter_intersection CHECK (CASE WHEN skip_filter THEN true ELSE (address & address_mask) = intersected_address END),
  CONSTRAINT filter_union CHECK (CASE WHEN skip_filter THEN true ELSE (address | address_mask) = united_address END)
);

CREATE TABLE network_priorities (
  id integer PRIMARY KEY,
  first_address peer_address,
  second_address inet,
  comparison_result integer,
  larger_address inet,
  smaller_address inet,
  prefer_larger boolean,
  selected_address inet,
  CONSTRAINT priority_comparison CHECK (network_cmp(first_address, second_address) = comparison_result),
  CONSTRAINT priority_larger CHECK (network_larger(first_address, second_address) = larger_address),
  CONSTRAINT priority_smaller CHECK (network_smaller(first_address, second_address) = smaller_address),
  CONSTRAINT priority_selected CHECK ((CASE WHEN prefer_larger THEN network_larger(first_address, second_address) ELSE network_smaller(first_address, second_address) END) = selected_address)
);

CREATE TABLE network_outputs (
  id integer PRIMARY KEY,
  address inet,
  subnet cidr,
  hash_seed bigint,
  host_text text COLLATE "C",
  full_text text COLLATE "C",
  short_text text COLLATE "C",
  subnet_text text COLLATE "C",
  address_bytes bytea,
  subnet_bytes bytea,
  hash_value integer,
  seeded_hash bigint,
  CONSTRAINT output_host CHECK (host(address) = host_text),
  CONSTRAINT output_text CHECK (text(address) = full_text),
  CONSTRAINT output_abbrev CHECK (abbrev(address) = short_text),
  CONSTRAINT output_cidr_abbrev CHECK (abbrev(subnet) = subnet_text),
  CONSTRAINT output_inet_send CHECK (inet_send(address) = address_bytes),
  CONSTRAINT output_cidr_send CHECK (cidr_send(subnet) = subnet_bytes),
  CONSTRAINT output_hash CHECK (hashinet(address) = hash_value),
  CONSTRAINT output_hash_extended CHECK (hashinetextended(address, hash_seed) = seeded_hash),
  CONSTRAINT output_literal CHECK (address IS NULL OR inet_send(address) <> '\x'::bytea)
);
